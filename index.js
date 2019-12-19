const Genemo = require('genemo');
const sort = require('fast-sort');
const Worker = require('./worker');
const Charts = require('./charts');

const POP_SIZE = 2000;
const GEN_COUNT = 600;
const HEALTHY_EMPLOYMENT = 0.50;
const GROWTH_RATE = 1.007;

const generations = parseInt(process.argv[2]) || GEN_COUNT;
const updateSize = ~~(generations * 0.005);
const updateModulo = (updateSize > 10) ? updateSize : 10;
let populationSize = parseInt(process.argv[3]) || POP_SIZE;
let healthyEmploymentCount = populationSize * HEALTHY_EMPLOYMENT;
// Birth Rates = Native, Island/Other, Asian, White, Latin, Black
const colorBirthRates = [0.0408, 0.0593, 0.0593, 0.0672, 0.0676, 0.0631];
const colorImmigrants = [0.0, 0.0000145, 0.0012136, 0.0002410, 0.0014078, 0.0003395];
//const colorImmigrants = [0.0, 0.0, 0.0, 0.0, 0.0, 0.0];

// for (let itr = 0; itr < colorBirthRates.length; itr++) {
//   colorBirthRates[itr] = colorBirthRates[itr] / 2;
// }

let population;
let cullCount = 0;
let pairingsCount = 0;
let mateCount = 0;
let populationCounts = 0;
let populationSet = [];
let flippedCount = 0;
let flippedData = [];
let flippedSet = [];
let colorCounts;
let colorData = [];
let colorSets = [];
let fitnessCounts;
let fitnessData = [];
let fitnessSets = [];
let skillCounts;
let skillData = [];
let skillSets = [];
let employedCounts;
let employedData = [];
let employedSets = [];
let talentCounts;
let talentData = [];
let talentSets = [];
let genderCounts;
let genderData = [];
let genderSets = [];

let immigrantCounts = [0, 0, 0, 0, 0, 0];

function calcRunningAverage(arr, size) {
  const out = [];
  for (let itr = 0; itr <= arr.length; itr++) {
    let sum = 0;
    for (let jtr = (-size + 1); jtr <= 0; jtr++) {
      let idx = itr + jtr;
      sum += arr[idx] || 0;
    }
    sum /= size;
    out.push(sum);
  }
  return out;
}

function lerp(valA, valB, intrp) {
  let dist = valB - valA;
  let amt = valA + (dist * intrp);
  return amt;
}

function evaluatePopulation(population, rng) {
  let out = [];
  for (let individual of population) {
    out.push(individual.fitness());
  }
  return out;
}

function crossover(pair, rng) {
  let childA = [];
  let childB = [];
  let out = [];
  pairingsCount++;
  // Only return a new child from two workers who are both employed
  // Only return a new child from two workers who are opposite sexes
  if ((pair[0].sex + pair[1].sex) === 1) {
    let birthColor = pair[0].color;
    if (pair[1].sex === 1) { birthColor = pair[1].color; }
    // Generate new births based on racial birthrates
    if (rng() <= colorBirthRates[birthColor]) {
      for (let itr = 0; itr < 4; itr++) {
        childA.push(lerp(pair[0].chromosomes[itr], pair[1].chromosomes[itr], rng()));
        let idx = ~~(rng() * 2);
        childB.push(pair[idx].chromosomes[itr]);
      }
      let workerA = new Worker(childA);
      let workerB = new Worker(childB);
      workerA.lenUnemployed = (pair[0].lenUnemployed + pair[0].lenUnemployed) / 2;
      let idx = ~~(rng() * 2);
      workerA.lenUnemployed = pair[idx].lenUnemployed;
      out.push(workerA);
      // There is a twin
      if (rng() < 0.0339) {
        out.push(workerB);
      }
      mateCount++;
    }
  }
  return out;
}

function mutate(ind, rng) {
  return ind.mutate(null, rng)
}

function employ(population) {
  // let sorted = population.sort((a, b) => { return b.fitness - a.fitness; });
  let sorted = sort(population).asc((pop) => { return pop.fitness });
  let splitPopSize = sorted.length - populationSize;
  let left = [];
  let right = [];
  if (sorted.length > populationSize) {
    left = sorted.slice(0, splitPopSize);
    right = sorted.slice(splitPopSize);
  } else {
    right = sorted;
  }
  let empCount = 0;
  // left.forEach((element) => { element.individual.sack(); });
  for (element of left) {
    element.individual.sack();
  }
  // right.forEach((element) => { empCount += element.individual.employ(); });
  for (element of right) {
    empCount += element.individual.employ();
  }
  let combined = [ ...left, ...right ];
  if (empCount < healthyEmploymentCount) {
    // let unemployed = combined.filter((element) => !element.individual.employed );
    const unemployed = [];
    for (element of combined) {
      if (!element.individual.employed) {
        unemployed.push(element);
      }
    }
    // let employed = combined.filter((element) => element.individual.employed );
    const employed = [];
    for (element of combined) {
      if (element.individual.employed) {
        employed.push(element);
      }
    }
    let sorted2 = unemployed.sort((a, b) => { return b.fitness - a.fitness; });
    let splitSize = healthyEmploymentCount - empCount;
    splitPopSize = sorted2.length - splitSize;
    left = sorted.slice(0, splitPopSize);
    right = sorted.slice(splitPopSize);
    // right.forEach((element) => {
    //   if (empCount < healthyEmploymentCount) {
    //     empCount += element.individual.secondChoice();
    //   } else if (empCount < populationSize) {
    //     empCount += element.individual.secondChoiceEmploy();
    //   }
    // });
    for (element of right) {
      if (empCount < healthyEmploymentCount) {
        empCount += element.individual.secondChoice();
      } else if (empCount < populationSize) {
        empCount += element.individual.secondChoiceEmploy();
      }
    }
    combined = [ ...left, ...right, ...employed ];
  }
  return combined;
}

function succession(map, rng) {
  let evaluatedPopulation = [];
  cullCount = 0;
  for (let individual of map.prevPopulation) {
    if (individual.individual.succession(null, rng)) {
      evaluatedPopulation.push({
        individual: individual.individual,
        fitness: individual.individual.fitness()
      });
    } else {
      cullCount++;
    }
  }
  for (let individual of map.childrenPopulation) {
    evaluatedPopulation.push({
      individual: individual.individual,
      fitness: individual.individual.fitness()
    });
  }

  // Generate Immigrants
  let popSize = evaluatedPopulation.length;
  for (let itr = 0; itr < immigrantCounts.length; itr++) {
    let rate = colorImmigrants[itr];
    immigrantCounts[itr] += rate * popSize;
    let temp = ~~(immigrantCounts[itr]);
    if (temp > 0) {
      for (let jtr = 0; jtr < temp; jtr++) {
        let wrk = Worker.generate(undefined, itr);
        evaluatedPopulation.push({
          individual: wrk,
          fitness: wrk.fitness()
        });
      }
      immigrantCounts[itr] -= temp;
    }
  }
  evaluatedPopulation = employ(evaluatedPopulation);
  let dev = Genemo.elitism({ keepFactor: populationSize / 100, minimizeFitness: false });
  return dev({ prevPopulation: evaluatedPopulation, childrenPopulation: [] });
}

function groupCount(collection, min, max, granularity) {
  let dist = ~~((max - min) / granularity) + 1;
  let buckets = new Array(dist).fill(0);
  for (let individual of collection) {
    let idx = ~~Math.round(individual / granularity);
    buckets[idx]++;
  }
  return buckets;
}

function bucketCount(collection, prefill) {
  let buckets = prefill || {};
  for (let val of collection) {
    if (!buckets.hasOwnProperty(val)) { buckets[val] = 0; }
    buckets[val]++;
  }
  return buckets;
}

function normalizeToPopulation(buckets, population) {
  for (let key in buckets) {
    buckets[key] = buckets[key] / population * 100;
  }
  return buckets;
}

function makeInitialBuckets(size) {
  let out = {};
  for (let itr = 0; itr < size; itr++) {
    out[`${itr}`] = 0;
  }
  return out;
}

function getColorCounts(pop) {
  let values = pop.map((ind) => ind.evaluateColor())
  let initBuckets = makeInitialBuckets(3);
  return bucketCount(values, initBuckets);
}

function getEmploymentCounts(pop) {
  let values = pop.map((ind) => ind.employed);
  let initBuckets = makeInitialBuckets(3);
  return bucketCount(values, initBuckets);
}

function getTalentCounts(pop) {
  let values = pop.map((ind) => ~~(Math.round(ind.talent / 0.02)));
  let initBuckets = makeInitialBuckets(51);
  return bucketCount(values, initBuckets);
}

function getSkillCounts(pop) {
  let values = pop.map((ind) => ~~(Math.round(ind.skill / 0.02)));
  let initBuckets = makeInitialBuckets(51);
  return bucketCount(values, initBuckets);
}

function getFitnessCounts(pop) {
  let values = pop.map((ind) => {
    let fit = ind.fitness();
    return ~~(Math.round(fit / 0.05));
  });
  let initBuckets = makeInitialBuckets(21);
  return bucketCount(values, initBuckets);
}

function getFlippedCount(pop) {
  let value = pop.reduce((acc, ind) => {
    return acc + ind.flipped;
  });
  return value;
}

function pivotData(data) {
  let out = [];
  for (let ele of data) {
    for (let idx in ele) {
      if (data.hasOwnProperty(idx)) {
        if (out[idx] === undefined) {
          out[idx] = [];
        }
        out[idx].push(ele[idx]);
      }
    }
  }
  return out;
}

function HSVtoRGB(h, s, v) {
    var r, g, b, i, f, p, q, t;
    if (arguments.length === 1) {
        s = h.s, v = h.v, h = h.h;
    }
    i = Math.floor(h * 6);
    f = h * 6 - i;
    p = v * (1 - s);
    q = v * (1 - f * s);
    t = v * (1 - (1 - f) * s);
    switch (i % 6) {
        case 0: r = v, g = t, b = p; break;
        case 1: r = q, g = v, b = p; break;
        case 2: r = p, g = v, b = t; break;
        case 3: r = p, g = q, b = v; break;
        case 4: r = t, g = p, b = v; break;
        case 5: r = v, g = p, b = q; break;
    }
    return {
        r: Math.round(r * 255),
        g: Math.round(g * 255),
        b: Math.round(b * 255)
    };
}

function genLabels(data, labels) {
  let out = [];
  let len = data[0].length;
  for (let itr = 0; itr < len; itr++) {
    let val = `${itr}`;
    if (Array.isArray(labels) && typeof labels[itr] !== 'undefined') {
      val = labels[itr]
    }
    out.push(val);
  }
  return out;
}

function genDataSets(data, labels) {
  let out = [];
  let len = data.length;
  let offset = 1 / len;
  for (let itr = 0; itr < len; itr++) {
    let angle = offset * itr;
    let colors = HSVtoRGB(angle, 0.9, 0.9);
    let bgColor = `rgba(${colors.r}, ${colors.g}, ${colors.b}, 0.6)`;
    let lineColor = `rgba(${colors.r}, ${colors.g}, ${colors.b}, 1.0)`;
    let label = `${itr}`;
    if (Array.isArray(labels) && typeof labels[itr] !== 'undefined') {
      label = labels[itr]
    }
    out.push({
      label: label,
      backgroundColor: bgColor,
      borderColor: lineColor,
      data: data[itr],
      pointRadius: 0,
      borderWidth: 2
    });
  }
  return out;
}

function generateStats(population) {
  populationCounts = population.length;
  colorCounts = getColorCounts(population);
  colorCounts = normalizeToPopulation(colorCounts, population.length);
  employedCounts = getEmploymentCounts(population);
  employedCounts = normalizeToPopulation(employedCounts, population.length);
  skillCounts = getSkillCounts(population);
  skillCounts = normalizeToPopulation(skillCounts, population.length);
  talentCounts = getTalentCounts(population);
  talentCounts = normalizeToPopulation(talentCounts, population.length);
  fitnessCounts = getFitnessCounts(population);
  fitnessCounts = normalizeToPopulation(fitnessCounts, population.length);
  // flippedCount = getFlippedCount(population);
}

function pushStats() {
  populationSet.push(populationCounts);
  colorSets.push(colorCounts);
  employedSets.push(employedCounts);
  skillSets.push(skillCounts);
  talentSets.push(talentCounts);
  fitnessSets.push(fitnessCounts);
  // flippedSet.push(flippedCount);
}

function displayStats(population, iteration) {
  console.log('============================================================');
  console.log(`GENERATION ${iteration}`);
  console.log('============================================================');
  console.log(`Count: ${population.length}`);
  console.log(`Culled: ${cullCount}`);
  console.log(`Colors: ${JSON.stringify(colorCounts)}`);
  console.log(`Employed: ${JSON.stringify(employedCounts)}`);
  console.log(`Skill: ${JSON.stringify(skillCounts)}`);
  console.log(`Fitness: ${JSON.stringify(fitnessCounts)}`);
  console.log('============================================================');
}

function genPop(rng) {
  let gen = Genemo.generateInitialPopulation({
    generateIndividual: Worker.generate,
    size: populationSize
  });
  let initialPopulation = gen(rng);
  console.log('Iteration: 0');
  console.log(`Count: ${initialPopulation.length}`);
  let skillCounts = getSkillCounts(initialPopulation);
  console.log(`Skill: ${JSON.stringify(skillCounts)}`);
  return initialPopulation;
}

function generatePopulationCharts(populationData) {
  let runningPop = calcRunningAverage(populationData, 10);
  let data = [populationData, runningPop];
  let labels = genLabels(data);
  let dataSets = genDataSets(data, ['Population', 'Running Avg.']);
  return Charts.generateCharts('Population', 'Population over Generations', labels, dataSets, true, true);
}

function generateSkillCharts(skillData) {
  let labels = genLabels(skillData);
  let dataSets = genDataSets(skillData);
  return Charts.generateCharts('Skill', 'Skill over Generations', labels, dataSets);
}

function generateTalentCharts(talentData) {
  let labels = genLabels(talentData);
  let dataSets = genDataSets(talentData);
  return Charts.generateCharts('Talent', 'Talent over Generations', labels, dataSets);
}

function generateFitnessCharts(fitnessData) {
  let labels = genLabels(fitnessData);
  let dataSets = genDataSets(fitnessData);
  return Charts.generateCharts('Fitness', 'Fitness over Generations', labels, dataSets);
}

function generateEmployedCharts(employedData) {
  let baseLabels = ['Unemployed', 'Employed', '2nd Choice Employment'];
  let labels = genLabels(employedData);
  let dataSets = genDataSets(employedData, baseLabels);
  return Charts.generateCharts('Employed', 'Employed over Generations', labels, dataSets);
}

function generateColorCharts(colorData) {
  let baseLabels = ['Native', 'Island/Other', 'Asian', 'White', 'Latin', 'Black'];
  let labels = genLabels(colorData);
  let dataSets = genDataSets(colorData, baseLabels);
  return Charts.generateCharts('Color', 'Color over Generations', labels, dataSets);
}

function generateFlippedChart(flippedData) {
  let labels = genLabels(flippedData);
  let dataSets = genDataSets(flippedData);
  return Charts.generateCharts('Flipped', 'Employment Flip over Generations', labels, dataSets, true);
}

let written = false;

Genemo.run({
  generateInitialPopulation: genPop,
  evaluatePopulation: evaluatePopulation,
  succession: succession,
  selection: Genemo.selection.roulette({ minimizeFitness: false }),
  reproduce: Genemo.reproduce({
    crossover: crossover,
    mutate: mutate,
    mutationProbability: 0.01
  }),
  stopCondition: Genemo.stopCondition({ maxIterations: generations }),
  iterationCallback: (({ evaluatedPopulation, iteration }) => {
    population = evaluatedPopulation.map((ind) => ind.individual);
    generateStats(population);
    pushStats();
    populationSize *= GROWTH_RATE;
    healthyEmploymentCount = populationSize * HEALTHY_EMPLOYMENT;
    if (iteration % updateModulo === 0) {
      let percent = (~~((iteration-10) * 1000 / generations) / 10);
      let str = `Completed: ${percent}% (${iteration} / ${generations})`;
      let newStr = '';
      if (written) {
        for (let itr = 0; itr < str.length; itr++) { newStr += '\b'; }
      } else {
        written = true;
      }
      percent = (~~((iteration) * 1000 / generations) / 10);
      str = `Completed: ${percent}% (${iteration} / ${generations})`;
      process.stdout.write(`${newStr}${str}`);
    }
    // displayStats(population, iteration);
  })
})
.then(({ evaluatedPopulation, iteration }) => {
  population = evaluatedPopulation.map((ind) => ind.individual);
  generateStats(population);
  displayStats(population, iteration);
  skillData = pivotData(skillSets);
  talentData = pivotData(talentSets);
  fitnessData = pivotData(fitnessSets);
  employedData = pivotData(employedSets);
  colorData = pivotData(colorSets);
  flippedData = pivotData(flippedSet);
  return generatePopulationCharts(populationSet);
})
.then(() => {
  return generateSkillCharts(skillData);
})
.then(() => {
  return generateTalentCharts(talentData);
})
.then(() => {
  return generateFitnessCharts(fitnessData);
})
.then(() => {
  return generateEmployedCharts(employedData);
})
.then(() => {
  return generateColorCharts(colorData);
})
// .then(() => {
//   return generateFlippedChart(flippedData);
// })
.catch((err) => {
  console.error(err);
});
