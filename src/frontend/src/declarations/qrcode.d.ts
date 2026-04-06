declare module 'qrcode' {
  interface QRCodeOptions {
    width?: number;
    margin?: number;
    color?: {
      dark?: string;
      light?: string;
    };
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  }

  function toCanvas(
    canvas: HTMLCanvasElement,
    text: string,
    options?: QRCodeOptions,
  ): Promise<void>;

  function toDataURL(
    text: string,
    options?: QRCodeOptions,
  ): Promise<string>;

  function toString(
    text: string,
    options?: QRCodeOptions,
  ): Promise<string>;

  export default {
    toCanvas,
    toDataURL,
    toString,
  };

  export { toCanvas, toDataURL, toString };
}
