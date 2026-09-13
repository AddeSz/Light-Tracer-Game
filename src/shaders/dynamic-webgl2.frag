#version 300 es
precision mediump float;

out vec4 outputColor;
in vec3 fragmentColor;

void main(){
  outputColor = vec4(fragmentColor, 1.0);
}
