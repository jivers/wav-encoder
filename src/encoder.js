"use stirct";

import InlineWorker from "inline-worker";
import encoder from "./encoder-worker";

export default class Encoder {
  constructor(format = {}) {
    this.format = {
      floatingPoint: !!(format.floatingPoint),
      bitDepth: (format.bitDepth|0) || 16,
    };
    this._worker = new InlineWorker(encoder, encoder.self);
    this._worker.onmessage = (e) => {
      let callback = this._callbacks[e.data.callbackId];

      if (callback) {
        if (e.data.type === "encoded") {
          callback.resolve(e.data.buffer);
        } else {
          callback.reject(new Error(e.data.message));
        }
      }

      this._callbacks[e.data.callbackId] = null;
    };
    this._callbacks = [];
  }

  encode(audioData, format = this.format) {
    return new Promise((resolve, reject) => {
      let callbackId = this._callbacks.length;

      this._callbacks.push({ resolve, reject });

      let numberOfChannels = audioData.channelData.length;
      let length = audioData.channelData[0].length;
      let sampleRate = audioData.sampleRate;
      let buffers = audioData.channelData.map(data => data.buffer);

      audioData = { numberOfChannels, length, sampleRate, buffers };

      this._worker.postMessage({
        type: "encode", audioData, format, callbackId
      }, audioData.buffers);
    });
  }
}