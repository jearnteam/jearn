export function getGraphOptions() {
  return {
    layout: { improvedLayout: true },

    physics: {
      stabilization: { enabled: true, iterations: 200 },
      barnesHut: {
        gravitationalConstant: -1500,
        springLength: 160,
        springConstant: 0.035,
        damping: 0.25,
      },
    },

    interaction: {
      hover: true,
      tooltipDelay: 150,
    },

    edges: {
      smooth: {
        type: "cubicBezier",
        roundness: 0.08,
      },
    },
  };
}
