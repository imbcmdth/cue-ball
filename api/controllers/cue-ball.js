const CueBallCore = require('../helpers/cue-ball-core.js');

const cueBall = new CueBallCore();

const enqueue = (req, res) => {
  const jobSpec = req.swagger.params.job.value;
  const job = cueBall.enqueue(jobSpec);

  res.json({job_id: job.id});
};

const dequeue = (req, res) => {
  const run = cueBall.dequeue();

  if (!run) {
    res.status(404);
    res.json({message:'No available jobs!'});
    return;
  }

  res.json(run);
};

const conclude = (req, res) => {
  const runId = req.swagger.params.run_id.value;
  const job = cueBall.conclude(runId);

  res.json({message: 'ok'});
};

module.exports = {
  enqueue,
  dequeue,
  conclude
};
