/**
 * Registers the Material Web form controls used across the app's forms.
 *
 * Static side-effect imports are safe here: ES modules are evaluated once, so
 * each customElements.define runs exactly once, and these tags live in the
 * React app bundles (dashboard/login), not in the isolated content-script
 * world where `customElements` is null. Styling comes from the --md-sys-*
 * tokens written by applyTheme(); see styles/material-web-tokens.css.
 *
 * v2.5.0 has no datepicker module. Use a native <input type="date"> placed in
 * an md-filled-text-field/md-outlined-text-field slot (see the token file).
 */

// Text fields
import '@material/web/textfield/filled-text-field.js';
import '@material/web/textfield/outlined-text-field.js';

// Selects + options
import '@material/web/select/filled-select.js';
import '@material/web/select/outlined-select.js';
import '@material/web/select/select-option.js';

// Buttons
import '@material/web/button/filled-button.js';
import '@material/web/button/outlined-button.js';
import '@material/web/button/text-button.js';
import '@material/web/iconbutton/icon-button.js';

// Selection controls
import '@material/web/switch/switch.js';
import '@material/web/checkbox/checkbox.js';

// Surfaces & supporting controls
import '@material/web/dialog/dialog.js';
import '@material/web/chips/assist-chip.js';
import '@material/web/chips/filter-chip.js';
import '@material/web/menu/menu.js';
import '@material/web/menu/menu-item.js';
import '@material/web/list/list-item.js';
import '@material/web/progress/circular-progress.js';
