import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { getAppRoot } from '../bridge';

describe('getAppRoot', () => {
  const hosts: HTMLElement[] = [];

  beforeEach(() => {
    hosts.forEach((host) => host.remove());
    hosts.length = 0;
    document.body.innerHTML = '';
  });

  afterEach(() => {
    hosts.forEach((host) => host.remove());
    hosts.length = 0;
  });

  it('finds the themed root inside an open shadow tree', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    hosts.push(host);
    const shadow = host.attachShadow({ mode: 'open' });
    const root = document.createElement('div');
    root.id = 'retop-root';
    shadow.appendChild(root);

    expect(getAppRoot()).toBe(root);
  });

  it('finds the offline root inside an open shadow tree', () => {
    (window as any).__RETOP_OFFLINE__ = true;
    const host = document.createElement('div');
    document.body.appendChild(host);
    hosts.push(host);
    const shadow = host.attachShadow({ mode: 'open' });
    const root = document.createElement('div');
    root.id = 'offline-root';
    shadow.appendChild(root);

    try {
      expect(getAppRoot()).toBe(root);
    } finally {
      delete (window as any).__RETOP_OFFLINE__;
    }
  });
});
