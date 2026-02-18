import { Options } from "vis-network";

export function getGraphOptions(): Options {
  return {
    autoResize: true,
    layout: {
      improvedLayout: true,
    },
    physics: {
      enabled: true,
      solver: "barnesHut",

      barnesHut: {
        gravitationalConstant: -3500, // stronger repulsion
        centralGravity: 0.3, // less forced centering
        springLength: 160, // more breathing space
        springConstant: 0.02, // more responsive edges
        damping: 0.45, // smooth settle
        avoidOverlap: 0.8, // prevent stacking
      },

      stabilization: {
        iterations: 200,
        fit: true,
      },
    },

    interaction: {
      zoomView: true,
      dragView: true,
    },
    nodes: {
      font: {
        size: 14,
      },
    },
    edges: {
      smooth: false,
      length: 140,
    },
  };
}
