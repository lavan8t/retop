import { bitmaps } from "./bitmaps";

const pre_img = (img: number[][]) => {
  let avg = 0;
  img.forEach((e) => e.forEach((f) => (avg += f)));
  avg /= 24 * 22;
  const bits: number[][] = new Array(img.length);
  for (let i = 0; i < img.length; i += 1) {
    bits[i] = new Array(img[0].length);
    for (let j = 0; j < img[0].length; j += 1) {
      if (img[i][j] > avg) {
        bits[i][j] = 1;
      } else {
        bits[i][j] = 0;
      }
    }
  }
  return bits;
};

const saturation = (d: Uint8ClampedArray) => {
  const saturate = new Array(d.length / 4);
  for (let i = 0; i < d.length; i += 4) {
    const min = Math.min(d[i], d[i + 1], d[i + 2]);
    const max = Math.max(d[i], d[i + 1], d[i + 2]);
    saturate[i / 4] = max === 0 ? 0 : Math.round(((max - min) * 255) / max);
  }
  const img: number[][] = new Array(40);
  for (let i = 0; i < 40; i += 1) {
    img[i] = new Array(200);
    for (let j = 0; j < 200; j += 1) {
      img[i][j] = saturate[i * 200 + j];
    }
  }
  const bls = new Array(6);
  for (let i = 0; i < 6; i += 1) {
    const x1 = (i + 1) * 25 + 2;
    const y1 = 7 + 5 * (i % 2) + 1;
    const x2 = (i + 2) * 25 + 1;
    const y2 = 35 - 5 * ((i + 1) % 2);
    bls[i] = img.slice(y1, y2).map((row) => row.slice(x1, x2));
  }
  return bls;
};

const flatten = (arr: number[][]) => {
  const bits = new Array(arr.length * arr[0].length);
  for (let i = 0; i < arr.length; i += 1) {
    for (let j = 0; j < arr[0].length; j += 1) {
      bits[i * arr[0].length + j] = arr[i][j];
    }
  }
  return bits;
};

const mat_mul = (a: number[][], b: number[][]) => {
  const x = a.length,
    z = a[0].length,
    y = b[0].length;
  const productRow = Array.apply(null, new Array(y)).map(
    Number.prototype.valueOf,
    0,
  );
  const product = new Array(x);
  for (let p = 0; p < x; p++) {
    product[p] = productRow.slice();
  }
  for (let i = 0; i < x; i++) {
    for (let j = 0; j < y; j++) {
      for (let k = 0; k < z; k++) {
        product[i][j] += a[i][k] * b[k][j];
      }
    }
  }
  return product;
};

const mat_add = (a: number[], b: number[]) => {
  const x = a.length;
  const c = new Array(x);
  for (let i = 0; i < x; i++) {
    c[i] = a[i] + b[i];
  }
  return c;
};

const max_soft = (a: number[]) => {
  const n = [...a];
  let s = 0;
  n.forEach((f) => {
    s += Math.exp(f);
  });
  for (let i = 0; i < a.length; i++) {
    n[i] = Math.exp(a[i]) / s;
  }
  return n;
};

export const autoSolveCaptcha = async (
  img: HTMLImageElement,
): Promise<string> => {
  if (!bitmaps || !bitmaps.weights || !bitmaps.biases) {
    console.warn(
      "bitmaps is not defined or missing NN data. Skipping auto-solver.",
    );
    return "";
  }

  const weights = bitmaps.weights as number[][];
  const biases = bitmaps.biases as number[];
  const label_txt = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) return "";

  canvas.width = 200;
  canvas.height = 40;

  // Draw the actual image passed from the main DOM
  ctx.drawImage(img, 0, 0, 200, 40);
  const pd = ctx.getImageData(0, 0, 200, 40);
  const bls = saturation(pd.data);
  let out = "";

  for (let i = 0; i < 6; i += 1) {
    let currentBls = pre_img(bls[i]);
    const flattened = [flatten(currentBls)];
    const multiplied = mat_mul(flattened, weights);
    const added = mat_add(multiplied[0], biases);
    const soft = max_soft(added);
    const index = soft.indexOf(Math.max(...soft));
    out += label_txt[index];
  }

  return out;
};
