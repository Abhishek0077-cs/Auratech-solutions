
(function() {
  const canvas = document.getElementById('shader-canvas-ANIMATION_17');
  if (!canvas) return;

  function syncSize() {
    const w = Math.max(1, canvas.clientWidth || 1280);
    const h = Math.max(1, canvas.clientHeight || 720);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
  }

  if (typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(syncSize);
    ro.observe(canvas);
  }
  syncSize();

  const gl = canvas.getContext('webgl', { alpha: false, antialias: true, powerPreference: 'high-performance' }) ||
    canvas.getContext('experimental-webgl', { alpha: false, antialias: true, powerPreference: 'high-performance' });
  if (!gl) return;
  const vs = `attribute vec2 a_position;
varying vec2 v_texCoord;
void main() {
  v_texCoord = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;
  const fs = `precision highp float;
uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_mouse;
varying vec2 v_texCoord;

// 3D Simplex / FBM noise for volumetric electro-chemical gold fluid and rotating metallic crystals
vec3 hash3(vec3 p) {
    p = vec3(dot(p, vec3(127.1, 311.7, 74.7)),
             dot(p, vec3(269.5, 183.3, 246.1)),
             dot(p, vec3(113.5, 271.9, 124.6)));
    return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
}

float noise3d(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    vec3 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(dot(hash3(i + vec3(0.0,0.0,0.0)), f - vec3(0.0,0.0,0.0)),
                       dot(hash3(i + vec3(1.0,0.0,0.0)), f - vec3(1.0,0.0,0.0)), u.x),
                   mix(dot(hash3(i + vec3(0.0,1.0,0.0)), f - vec3(0.0,1.0,0.0)),
                       dot(hash3(i + vec3(1.0,1.0,0.0)), f - vec3(1.0,1.0,0.0)), u.x), u.y),
               mix(mix(dot(hash3(i + vec3(0.0,0.0,1.0)), f - vec3(0.0,0.0,1.0)),
                       dot(hash3(i + vec3(1.0,0.0,1.0)), f - vec3(1.0,0.0,1.0)), u.x),
                   mix(dot(hash3(i + vec3(0.0,1.0,1.0)), f - vec3(0.0,1.0,1.0)),
                       dot(hash3(i + vec3(1.0,1.0,1.0)), f - vec3(1.0,1.0,1.0)), u.x), u.y), u.z);
}

// Raymarched 3D floating metallic gold crystal lattice / molecular clusters
float sdOctahedron(vec3 p, float s) {
    p = abs(p);
    return (p.x + p.y + p.z - s) * 0.57735027;
}

mat2 rot2D(float a) {
    float c = cos(a);
    float s = sin(a);
    return mat2(c, -s, s, c);
}

float sceneDist(vec3 p, float t) {
    vec3 q = p;
    // infinite repeating 3D lattice of floating precious metal nodes
    vec3 c = vec3(2.4, 2.4, 2.4);
    vec3 id = floor((q + 0.5 * c) / c);
    q = mod(q + 0.5 * c, c) - 0.5 * c;
    
    // individual rotation per cell
    q.xy = rot2D(t * 0.4 + id.z * 0.3) * q.xy;
    q.yz = rot2D(t * 0.3 + id.x * 0.2) * q.yz;
    
    float oct = sdOctahedron(q, 0.45);
    return oct;
}

void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y;
    vec2 mouse = (u_mouse - 0.5 * u_resolution) / u_resolution.y;
    float t = u_time * 0.25;

    // Camera setup for 3D depth raymarching
    vec3 ro = vec3(mouse.x * 0.8, -t * 0.6 + mouse.y * 0.5, 2.8);
    vec3 rd = normalize(vec3(uv, -1.2));
    rd.xz = rot2D(mouse.x * 0.4) * rd.xz;
    rd.yz = rot2D(mouse.y * 0.3) * rd.yz;

    // Raymarching floating 3D gold crystals
    float dist = 0.0;
    float totalDist = 0.0;
    float glow = 0.0;
    for(int i = 0; i < 48; i++) {
        vec3 p = ro + rd * totalDist;
        dist = sceneDist(p, t);
        if(dist < 0.002 || totalDist > 16.0) break;
        glow += 0.015 / (0.05 + abs(dist));
        totalDist += dist * 0.65;
    }

    // 3D procedural metallic fluid wave in background
    vec3 pFluid = vec3(uv * 1.8, t * 0.5);
    pFluid.xy += mouse * 0.15;
    float n1 = noise3d(pFluid * 1.4 + vec3(0.0, 0.0, t * 0.5));
    float n2 = noise3d(pFluid * 2.8 - vec3(n1 * 0.7, t * 0.3, n1));
    float wave = n1 * 0.6 + n2 * 0.4;
    float caustic = pow(max(0.0, 1.0 - abs(wave * 2.2)), 3.0);

    // Luxury Dark Gold Corporate Palette
    vec3 bgCol = vec3(0.045, 0.045, 0.05); // deep obsidian
    vec3 goldBase = vec3(0.72, 0.53, 0.16);
    vec3 goldBright = vec3(1.0, 0.88, 0.48);
    vec3 goldWarm = vec3(0.85, 0.65, 0.22);

    vec3 col = bgCol;
    
    // Add fluid caustics and subtle ambient gold wave
    col += goldBase * max(0.0, wave + 0.2) * 0.25;
    col += goldBright * caustic * 0.45;

    // Shading 3D geometry hit
    if(totalDist < 16.0) {
        vec3 hitPos = ro + rd * totalDist;
        vec2 eps = vec2(0.005, 0.0);
        vec3 norm = normalize(vec3(
            sceneDist(hitPos + eps.xyy, t) - sceneDist(hitPos - eps.xyy, t),
            sceneDist(hitPos + eps.yxy, t) - sceneDist(hitPos - eps.yxy, t),
            sceneDist(hitPos + eps.yyx, t) - sceneDist(hitPos - eps.yyx, t)
        ));
        
        vec3 lightDir = normalize(vec3(0.5, 0.8, 1.0));
        float diff = max(0.0, dot(norm, lightDir));
        vec3 refl = reflect(rd, norm);
        float spec = pow(max(0.0, dot(refl, lightDir)), 16.0);
        float rim = pow(1.0 - max(0.0, -dot(rd, norm)), 2.5);

        vec3 matCol = mix(goldWarm, goldBright, spec);
        vec3 crystalCol = (goldBase * 0.2 + matCol * (diff * 0.8 + spec * 1.2) + goldBright * rim * 0.6);
        
        // Depth atmospheric fog
        float fog = exp(-totalDist * 0.18);
        col = mix(col, crystalCol, fog);
    }

    // Add volumetric bloom glow around floating nodes
    col += goldWarm * (glow * 0.025);

    // Circuit grid overlay subtle accent
    vec2 grid = abs(fract(uv * 12.0 - 0.5) - 0.5);
    float gridLine = 1.0 - smoothstep(0.0, 0.03, min(grid.x, grid.y));
    col += goldBase * gridLine * 0.04;

    // Subtle edge vignette so text stays high contrast
    float vig = 1.0 - smoothstep(0.4, 1.45, length(uv));
    col *= vig;

    gl_FragColor = vec4(col, 1.0);
}`;
  function cs(type, src) {
    const s = gl.createShader(type);
    if (!s) return null;

    gl.shaderSource(s, src);
    gl.compileShader(s);

    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error('Shader compile failed:', gl.getShaderInfoLog(s));
      gl.deleteShader(s);
      return null;
    }

    return s;
  }

  const vertexShader = cs(gl.VERTEX_SHADER, vs);
  const fragmentShader = cs(gl.FRAGMENT_SHADER, fs);
  if (!vertexShader || !fragmentShader) return;

  const prog = gl.createProgram();
  if (!prog) return;

  gl.attachShader(prog, vertexShader);
  gl.attachShader(prog, fragmentShader);
  gl.linkProgram(prog);

  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error('Program link failed:', gl.getProgramInfoLog(prog));
    gl.deleteProgram(prog);
    return;
  }

  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
  const pos = gl.getAttribLocation(prog, 'a_position');
  gl.enableVertexAttribArray(pos);
  gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);
  const uTime = gl.getUniformLocation(prog, 'u_time');
  const uRes = gl.getUniformLocation(prog, 'u_resolution');
  const uMouse = gl.getUniformLocation(prog, 'u_mouse');

  // u_mouse is in pixel coordinates matching u_resolution (ShaderToy convention).
  // Shaders that need normalized coords should use: u_mouse / u_resolution.
  let mouse = { x: canvas.width / 2, y: canvas.height / 2 };
  window.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    if (rect.width && rect.height) {
      const nx = (event.clientX - rect.left) / rect.width;
      const ny = 1.0 - (event.clientY - rect.top) / rect.height;
      mouse.x = nx * canvas.width;
      mouse.y = ny * canvas.height;
    }
  });

  function render(t) {
    if (typeof ResizeObserver === 'undefined') syncSize();
    gl.viewport(0, 0, canvas.width, canvas.height);
    if (uTime) gl.uniform1f(uTime, t * 0.001);
    if (uRes) gl.uniform2f(uRes, canvas.width, canvas.height);
    if (uMouse) gl.uniform2f(uMouse, mouse.x, mouse.y);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    requestAnimationFrame(render);
  }
  render(0);
})();