/**
 * The lab cameras shown on the Lab Cameras page.
 *
 * These are Raspberry Pi cameras set up in the DAMP Lab (North/South) that push
 * to a MediaMTX stream server. Each camera is served as a self-contained HLS web
 * player at `<base>/<id>/`, so the UI only needs the base URL and a path per
 * camera — there is no backend involvement here.
 *
 * The base URL is overridable with `VITE_CAMERA_BASE_URL` (see `.env.example`) so
 * the stream host can move without a code change. The fallback is the current
 * HTTPS host. It must stay HTTPS: Canvas is served over HTTPS and a browser
 * blocks an HTTP stream embedded in an HTTPS page as mixed content.
 */
const DEFAULT_CAMERA_BASE_URL = 'https://damplab-feed2.sail.codes';

export const CAMERA_BASE_URL: string = (
  import.meta.env.VITE_CAMERA_BASE_URL || DEFAULT_CAMERA_BASE_URL
).replace(/\/+$/, '');

export interface LabCamera {
  /** Stream path segment, e.g. `cam1`. */
  id: string;
  /** Human label shown on the card. */
  label: string;
  /** Which room the camera watches, when known. Informational for now. */
  room?: 'North' | 'South';
}

/**
 * The four cameras onboarded so far. Adding a camera is one line here once its
 * `camN` path exists on the stream server.
 */
export const LAB_CAMERAS: LabCamera[] = [
  { id: 'cam1', label: 'Camera 1' },
  { id: 'cam2', label: 'Camera 2' },
  { id: 'cam3', label: 'Camera 3' },
  { id: 'cam4', label: 'Camera 4' },
];

/** The embeddable player URL for a camera (MediaMTX serves a player at `/<id>/`). */
export function cameraStreamUrl(id: string): string {
  return `${CAMERA_BASE_URL}/${id}/`;
}
