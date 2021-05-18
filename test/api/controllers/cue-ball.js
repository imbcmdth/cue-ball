var should = require('should');
var request = require('supertest');
var server = require('../../../app');

describe('controllers', function() {

  describe('cue-ball', function() {

    describe('POST /enqueue', function() {
      it('should return a job_id when given a valid job', function(done) {
        request(server)
          .post('/enqueue')
          .send({type: 'TIME_CRITICAL'})
          .set('Accept', 'application/json')
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            should.not.exist(err);

            should.exist(res.body.job_id);

            done();
          });
      });

      it('should return a job_id when given a valid job with a payload', function(done) {
        request(server)
          .post('/enqueue')
          .send({type: 'TIME_CRITICAL', payload: {foo:'bar'}})
          .set('Accept', 'application/json')
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            should.not.exist(err);

            should.exist(res.body.job_id);

            done();
          });
      });

      it('should error if `type` is not provided', function(done) {
        request(server)
          .post('/enqueue')
          .send({foo: 'bar'})
          .set('Accept', 'application/json')
          .expect('Content-Type', /json/)
          .expect(400)
          .end(function(err, res) {
            should.not.exist(err);

            done();
          });
      });

      it('should error if `type` is not valid', function(done) {
        request(server)
          .post('/enqueue')
          .send({type: 'NOT_REAL!'})
          .set('Accept', 'application/json')
          .expect('Content-Type', /json/)
          .expect(400)
          .end(function(err, res) {
            should.not.exist(err);

            done();
          });
      });
    });

    describe('GET /dequeue', function() {

    });

    describe('PUT /conclude', function() {

    });

  });

});
