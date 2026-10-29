declare module "@novnc/novnc" {
  export default class RFB extends EventTarget {
    constructor(target: HTMLElement, socket: WebSocket);
    scaleViewport: boolean;
    resizeSession: boolean;
    viewOnly: boolean;
    focusOnClick: boolean;
    sendKey(keysym: number, code?: string, down?: boolean): void;
    disconnect(): void;
  }
}
