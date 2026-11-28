import type { Appearance } from "./model";
export const ADVANCED_ADJUSTMENTS = [
  "Exposure",
  "Brilliance",
  "Highlights",
  "Shadows",
  "Black point",
  "Vibrance",
  "Warmth",
  "Tint",
  "Sharpness",
  "Definition",
  "Vintage",
  "Fade",
  "Vignette",
] as const;
export const POSITIVE_ADJUSTMENTS = new Set([
  "Black point",
  "Sharpness",
  "Definition",
  "Vintage",
  "Fade",
  "Vignette",
]);
// Browser SDR implementation; the same shader is used by live preview and export.
// This preserves control intent without claiming bit-identical Core Image output.
export class ColorRenderer {
  canvas = document.createElement("canvas");
  gl: WebGLRenderingContext | null = null;
  program: WebGLProgram | null = null;
  texture: WebGLTexture | null = null;
  constructor() {
    const g = this.canvas.getContext("webgl", {
      alpha: false,
      preserveDrawingBuffer: true,
    });
    if (!g) return;
    this.gl = g;
    const shader = (type: number, source: string) => {
      const s = g.createShader(type)!;
      g.shaderSource(s, source);
      g.compileShader(s);
      if (!g.getShaderParameter(s, g.COMPILE_STATUS))
        throw Error("GPU color processing is unavailable.");
      return s;
    };
    const v = shader(
      g.VERTEX_SHADER,
      "attribute vec2 p; varying vec2 uv; void main(){uv=(p+1.0)*0.5;gl_Position=vec4(p,0.0,1.0);}",
    );
    const f = shader(
      g.FRAGMENT_SHADER,
      `precision mediump float;varying vec2 uv;uniform sampler2D image;uniform vec2 texel;uniform vec4 light;uniform vec4 color;uniform vec4 detail;uniform float vignette;
 void main(){vec3 original=texture2D(image,uv).rgb;vec3 neighbors=texture2D(image,uv+vec2(texel.x,0.0)).rgb+texture2D(image,uv-vec2(texel.x,0.0)).rgb+texture2D(image,uv+vec2(0.0,texel.y)).rgb+texture2D(image,uv-vec2(0.0,texel.y)).rgb;vec3 c=original+(original-neighbors*0.25)*(detail.x*1.7+detail.y*.7);c*=pow(2.0,light.x*2.0);float y=dot(c,vec3(.2126,.7152,.0722));c+=light.z*.35*pow(1.0-clamp(y,0.0,1.0),2.0);c+=light.w*.35*pow(clamp(y,0.0,1.0),2.0);c+=(c-vec3(.5))*light.y*.25;c-=color.w*.12;c.r+=color.x*.12+color.y*.03;c.b-=color.x*.12;c.g-=color.y*.1;float lum=dot(c,vec3(.2126,.7152,.0722));float sat=max(c.r,max(c.g,c.b))-min(c.r,min(c.g,c.b));c=mix(vec3(lum),c,1.0+color.z*(1.0-sat)*.8);vec3 sepia=vec3(dot(c,vec3(.393,.769,.189)),dot(c,vec3(.349,.686,.168)),dot(c,vec3(.272,.534,.131)));c=mix(c,sepia,detail.z*.5);c=mix(c,c*.75+vec3(.15),detail.w);vec2 pos=uv-vec2(.5);float edge=smoothstep(.16,.7,length(pos));c*=1.0-vignette*edge*.7;gl_FragColor=vec4(clamp(c,0.0,1.0),1.0);}`,
    );
    const program = g.createProgram()!;
    g.attachShader(program, v);
    g.attachShader(program, f);
    g.linkProgram(program);
    if (!g.getProgramParameter(program, g.LINK_STATUS))
      throw Error("GPU color processing is unavailable.");
    this.program = program;
    g.useProgram(program);
    const b = g.createBuffer();
    g.bindBuffer(g.ARRAY_BUFFER, b);
    g.bufferData(
      g.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      g.STATIC_DRAW,
    );
    const p = g.getAttribLocation(program, "p");
    g.enableVertexAttribArray(p);
    g.vertexAttribPointer(p, 2, g.FLOAT, false, 0, 0);
    this.texture = g.createTexture();
    g.bindTexture(g.TEXTURE_2D, this.texture);
    g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MIN_FILTER, g.LINEAR);
    g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MAG_FILTER, g.LINEAR);
    g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_S, g.CLAMP_TO_EDGE);
    g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_T, g.CLAMP_TO_EDGE);
    g.pixelStorei(g.UNPACK_FLIP_Y_WEBGL, 1);
  }
  render(
    video:
      HTMLVideoElement | HTMLImageElement | HTMLCanvasElement | OffscreenCanvas,
    a: Appearance,
  ): CanvasImageSource {
    const values = a.adjustments || {};
    if (!Object.values(values).some((v) => v !== 0)) return video;
    const g = this.gl,
      p = this.program;
    if (!g || !p)
      throw Error(
        "This device does not support GPU color adjustments. Reset the adjustments or try another browser.",
      );
    const width =
        video instanceof HTMLVideoElement
          ? video.videoWidth
          : video instanceof HTMLImageElement
            ? video.naturalWidth
            : video.width,
      height =
        video instanceof HTMLVideoElement
          ? video.videoHeight
          : video instanceof HTMLImageElement
            ? video.naturalHeight
            : video.height;
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
    g.viewport(0, 0, this.canvas.width, this.canvas.height);
    g.useProgram(p);
    g.bindTexture(g.TEXTURE_2D, this.texture);
    g.texImage2D(g.TEXTURE_2D, 0, g.RGBA, g.RGBA, g.UNSIGNED_BYTE, video);
    const value = (n: string) => values[n] || 0;
    g.uniform2f(
      g.getUniformLocation(p, "texel"),
      1 / this.canvas.width,
      1 / this.canvas.height,
    );
    g.uniform4f(
      g.getUniformLocation(p, "light"),
      value("Exposure"),
      value("Brilliance"),
      value("Shadows"),
      value("Highlights"),
    );
    g.uniform4f(
      g.getUniformLocation(p, "color"),
      value("Warmth"),
      value("Tint"),
      value("Vibrance"),
      value("Black point"),
    );
    g.uniform4f(
      g.getUniformLocation(p, "detail"),
      value("Sharpness"),
      value("Definition"),
      value("Vintage"),
      value("Fade"),
    );
    g.uniform1f(g.getUniformLocation(p, "vignette"), value("Vignette"));
    g.drawArrays(g.TRIANGLE_STRIP, 0, 4);
    return this.canvas;
  }
  destroy() {
    this.gl?.getExtension("WEBGL_lose_context")?.loseContext();
  }
}
