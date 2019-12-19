const RED = [1, 0, 0];
const YELLOW = [1, 1, 0];
const GREEN = [0, 1, 0];
const CYAN = [0, 1, 1];
const BLUE = [0, 0, 1];
const MAGENTA = [1, 0, 1];

// Distribution of Races = Native, Island/Other, Asian, White, Latin, Black
//const colorDistributions = [0.013, 0.029, 0.059, 0.604, 0.161, 0.134];
const colorDistributions = [0.013, 0.052, 0.111, 0.715, 0.876, 1.010];
const colors = [RED, YELLOW, GREEN, CYAN, BLUE, MAGENTA];

const COLOR_RED = 0;
const COLOR_YELLOW = 1;
const COLOR_GREEN = 2;
const COLOR_CYAN = 3;
const COLOR_BLUE = 4;
const COLOR_MAGENTA = 5;

const MAX_MUTATION_DRIFT = 0.5;

class PhenotypeWorker {
  constructor(chromosomes, employed, sex) {
      this.chromosomes = chromosomes;
      this.race = [];
      this.color = 3;
      this.talent = 0;
      this.skill = 0;
      this.employed = employed || 0;
      this.lenUnemployed = 0;
      this.lenEmployed = 0;
      this.flipped = 0;
      this.age = 0;
      this.sex = sex || ~~(Math.random() * 2);
      this.mapChromosomes(chromosomes);
  }

  zoruddef(val, def) {
    if (val && val !== undefined && val !== null || val === 0) {
      return val;
    }
    return def;
  }

  mapChromosomes(chromosomes) {
    this.race = [
      this.zoruddef(chromosomes[0], 0.5),
      this.zoruddef(chromosomes[1], 0.5),
      this.zoruddef(chromosomes[2], 0.5)
    ];
    this.skill = this.zoruddef(chromosomes[3], 0.5);
    this.talent = this.zoruddef(chromosomes[4], 0.5);
    this.color = this.evaluateColor();
  }

  colorDistance(color1, color2) {
    let a = color2[0] - color1[0];
    let b = color2[1] - color1[1];
    let c = color2[2] - color1[2];
    return Math.sqrt((a*a) + (b*b) + (c*c));
  }

  min(...params) {
    let ret = null;
    if (params.length > 0) {
      ret = params[0]
      for (let para of params) {
        if (ret > para) {
          ret = para;
        }
      }
    }
    return ret;
  }

  max(...params) {
    let ret = null;
    if (params.length > 0) {
      ret = params[0]
      for (let para of params) {
        if (ret < para) {
          ret = para;
        }
      }
    }
    return ret;
  }

  probClamp(val) {
    return this.min(this.max(0,val), 0.99999999);
  }

  evaluateColor(ind) {
    ind = ind || this;
    let deltaR = this.colorDistance(ind.race, RED);
    let deltaY = this.colorDistance(ind.race, YELLOW);
    let deltaG = this.colorDistance(ind.race, GREEN);
    let deltaC = this.colorDistance(ind.race, CYAN);
    let deltaB = this.colorDistance(ind.race, BLUE);
    let deltaM = this.colorDistance(ind.race, MAGENTA);

    let val = this.min(deltaR, deltaG, deltaB, deltaY, deltaC, deltaM);
    switch (val) {
      case deltaC: {
        return COLOR_CYAN;
        break;
      }
      case deltaM: {
        return COLOR_MAGENTA;
        break;
      }
      case deltaB: {
        return COLOR_BLUE;
        break;
      }
      case deltaY: {
        return COLOR_YELLOW;
        break;
      }
      case deltaR: {
        return COLOR_RED;
        break;
      }
      case deltaG: {
        return COLOR_GREEN;
        break;
      }
      default: {
        return COLOR_RED;
        break;
      }
    }
  }

  setEmployment(state) {
    if (state !== this.employed) {
      this.flipped = 1;
    } else {
      this.flipped = 0;
    }
    this.employed = state;
  }

  employ(ind, rng) {
    ind = ind || this;
    rng = rng || Math.random;
    if (rng() < (ind.skill + (ind.talent * (ind.lenEmployed + 1)))) {
      ind.setEmployment(1);
      ind.lenUnemployed = 0;
      ind.lenEmployed++;
    } else {
      ind.setEmployment(0);
      ind.lenEmployed = 0;
      if (ind.lenUnemployed !== 0) {
        ind.lenUnemployed++;
      }
    }
    return ind.employed;
  }

  secondChoice(ind) {
    ind = ind || this;
    ind.setEmployment(2);
    ind.lenUnemployed = 0;
    return 1;
  }

  secondChoiceEmploy(ind, rng) {
    ind = ind || this;
    rng = rng || Math.random;
    if (rng() < ind.skill) {
      ind.setEmployment(2);
      ind.lenUnemployed = 0;
      return 2;
    }
    return 0;
  }

  sack(ind) {
    ind = ind || this;
    ind.setEmployment(0);
    ind.lenUnemployed++;
  }

  fitness(ind) {
    ind = ind || this;
    if (ind.employed === 0) {
      return (1 - (ind.lenUnemployed / 4)) * (1 - ind.talent);
    }
    // Base fitness for all things is 1
    let fit = ind.skill + ind.talent;
    return this.probClamp(fit);
  }

  static lookupColor(val) {
    let len = colorDistributions.length;
    for (let itr = 0; itr < len; itr++) {
      let look = colorDistributions[itr];
      if (val < look) {
        return colors[itr];
      }
    }
    return colors[5];
  }

  static generate(rng, genColor) {
    rng = rng || Math.random;
    let chromosomes = [];
    let color = rng();
    let colorArray = PhenotypeWorker.lookupColor(color);
    if (genColor) {
      colorArray = colors[genColor];
    }
    chromosomes = [...colorArray];
    chromosomes.push(rng());
    chromosomes.push(rng());
    let employed = ~~(rng() * 2);
    let sex = ~~(rng() * 2);
    let worker = new PhenotypeWorker(chromosomes, employed, sex);
    worker.age = ~~(rng() * 25);
    return worker;
  }

  mutate(ind, rng) {
    ind = ind || this;
    rng = rng || Math.random;
    let idx = Math.floor(rng() * 4);
    let mutate = (rng() * MAX_MUTATION_DRIFT * 2) - MAX_MUTATION_DRIFT;
    let val = ind.chromosomes[idx] + mutate;
    ind.chromosomes[idx] = this.probClamp(val);
    return ind;
  }

  succession(ind, rng) {
    ind = ind || this;
    rng = rng || Math.random;
    let cull = 0.0;
    cull += (ind.lenUnemployed * 0.25);           // Cull chance increases if unemployed for a period
    cull += this.probClamp((ind.age - 30) * .1);  // Cull increases with age over 30
    if (rng() < cull) {
      // Cull this individual
      return false;
    }
    ind.age++;
    if (!ind.employed) {
      ind.lenUnemployed++;
    }
    return true;
  }
}

module.exports = PhenotypeWorker;
