const ChartjsNode = require('chartjs-node');

function generateCharts(name, title, labels, datasets, noStacked, lineOnly) {
  let chartNode = new ChartjsNode(1920, 1080);
  let chartOptions = {
    type: 'line',
    data: {
      labels: labels,
      datasets: datasets
    },
    options: {
      title: {
        display: true,
        text: title
      },
      scales: {
        yAxes: [{
          ticks: {
            beginAtZero: true
          }
        }]
      }
    }
  };
  let chartName = `./images/${name}Chart.png`;
  let stackedChartName = `./images/${name}StackedChart.png`;
  console.log(`Creating ${name} Chart...`);
  let firstChartOptions = Object.assign({}, chartOptions);
  if (lineOnly) {
    for (let val of firstChartOptions.data.datasets) {
      val.fill = false;
      val.showLine = true;
    }
  }
  return chartNode.drawChart(firstChartOptions)
    .then(() => {
      return chartNode.getImageBuffer('image/png');
    })
    .then((buffer) => {
      return chartNode.getImageStream('image/png');
    })
    .then((stream) => {
      return chartNode.writeImageToFile('image/png', chartName);
    })
    .then(() => {
      chartNode.destroy();
      if (!noStacked) {
        chartNode = new ChartjsNode(1920, 1080);
        chartOptions.options.scales.yAxes[0].stacked = true;
        console.log(`Creating ${name} Stacked Chart...`);
        return chartNode.drawChart(chartOptions)
      }
    })
    .then((buffer) => {
      if (buffer) {
        return chartNode.getImageStream('image/png');
      }
    })
    .then((stream) => {
      if (stream) {
        return chartNode.writeImageToFile('image/png', stackedChartName);
      }
    })
    .then(() => {
      chartNode.destroy();
      return;
    });
}


module.exports = {
  generateCharts
};
