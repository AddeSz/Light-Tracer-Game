#version 300 es
precision mediump float;

in vec2 vertexPosition;
in vec3 vertexColor;

out vec3 fragmentColor;

uniform vec2 canvasSize;
uniform vec2 shapeLocation;
uniform float shapeSize;

void main(){
  fragmentColor = vertexColor;
  vec2 finalVertexPosition = vertexPosition * shapeSize + shapeLocation;
  vec2 clipPosition = (finalVertexPosition / canvasSize) * 2.0 - 1.0;

  gl_Position = vec4(clipPosition, 0.0, 1.0);
}