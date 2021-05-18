const FastPriorityQueue = require('fastpriorityqueue');
const crypto = require('crypto');
const options = require('../../config/options.js');

const dateComparator = (a, b) => a.queued_at > b.queued_at;

class CueBallCore {
  constructor () {
    this.jobTypes = Object.keys(options.jobTypePriorities);

    // Only status="QUEUED" jobs should be in these queues
    this.jobQueues = this.jobTypes.reduce((obj, key) => {
        obj[key] = new FastPriorityQueue(dateComparator);
        return obj;
    }, {});

    // Maps a "run_id" to a single job
    // Only status="IN_PROGRESS" should be in this map
    this.runsMap = new Map();

    // Maps a "job_id" to a single job
    // All jobs regardless of state
    this.jobsMap = new Map();

    // TODO: There should ideally be a status="FAILED" map too

    // We track the stats below globally because doing the calculation
    // every time is wasteful!
    //
    // This is definitely more difficult to understand and makes
    // the other code in this class ugly...
    // ...there are probably a few additional levels of abstraction
    // that would help here!
    this.jobWeights = this.jobTypes.reduce((obj, key) => {
        obj[key] = 0;
        return obj;
    }, {});
    this.sumOfJobWeights = 0;
  }

  incWeights (type) {
    const weight = options.jobTypePriorities[type];

    this.jobWeights[type] += weight;
    this.sumOfJobWeights += weight;
  }

  decWeights (type) {
    const weight = options.jobTypePriorities[type];

    this.jobWeights[type] -= weight;
    this.sumOfJobWeights -= weight;
  }

  chooseQueueByWeights () {
    let decision = Math.random() * this.sumOfJobWeights;

    const chosenQueueName = this.jobTypes.find((key) => {
      decision -= this.jobWeights[key];
      // It is very important that this is not <= because then the
      // algoritm will be biased against the last element
      if (decision < 0) {
        return true;
      }
    });

    return chosenQueueName;
  }

  enqueue ({type, payload = {}}) {
    const targetQueue = this.jobQueues[type];
    const now = Date.now(); // Use performance.now?

    this.incWeights(type);

    const job = {
      id: crypto.randomBytes(20).toString('hex'),
      type,
      status: 'QUEUED',

      created_at: now,
      queued_at: now,
      retry_count: 0,
      payload,
    };

    this.jobsMap.set(job.id, job);
    targetQueue.add(job);

    return job;
  }

  dequeue () {
    if (this.sumOfJobWeights <= 0) {
      return null;
    }

    let chosenQueueName = this.chooseQueueByWeights();
    let chosenQueue = this.jobQueues[chosenQueueName];

    const job = chosenQueue.poll();

    this.decWeights(chosenQueueName);

    const run_id = crypto.randomBytes(20).toString('hex');

    // I HATE this...
    job.status = 'IN_PROGRESS';

    this.runsMap.set(run_id, job);

    const run = {
      id: job.id,// generate
      run_id,
      type: job.type,
      status: job.status,

      created_at: job.created_at,
      queued_at: job.queued_at,
      retry_count: job.retry_count,

      payload: job.payload
    };

    // This should REALLY be a recurring task instead of a
    // an ugly timer but, ironically, I'm runing out of time!
    setTimeout(this.timeout.bind(this), options.executionTimeout, run_id);

    return run;
  }

  conclude (run_id) {
    if (!this.runsMap.has(run_id)) {
      throw new Error('The provided run_id invalid or run timed out!');
    }

    const job = this.runsMap.get(run_id);
    this.runsMap.delete(run_id);

    // I HATE this...
    job.status = 'CONCLUDED';
  }

  timeout (run_id) {
    if (!this.runsMap.has(run_id)) {
      // The job has probably concluded...
      return;
    }

    const job = this.runsMap.get(run_id);
    this.runsMap.delete(run_id);

    if (job.retry_count === options.maxRetryCount) {
      // I HATE this...
      job.status = 'FAILED';

      return;
    }

    // I HATE all this...
    job.status = 'QUEUED';
    job.queued_at = Date.now();
    job.retry_count += 1;

    this.incWeights(job.type);

    const targetQueue = this.jobQueues[job.type];

    targetQueue.add(job);
  }
}

module.exports = CueBallCore;
