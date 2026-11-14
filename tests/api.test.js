const request = require('supertest');
const app = require('../src/server');

describe('Student Attendance System API Tests', () => {
  it('GET /api/health should return UP status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.statusCode).toEqual(200);
    expect(res.body.status).toEqual('UP');
    expect(res.body.service).toBeDefined();
  });

  it('POST /api/students should reject request when required fields are missing', async () => {
    const res = await request(app)
      .post('/api/students')
      .send({ name: 'Incomplete Student' }); // Missing rollNumber

    expect(res.statusCode).toEqual(400);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/attendance/mark should reject request without required fields', async () => {
    const res = await request(app)
      .post('/api/attendance/mark')
      .send({});

    expect(res.statusCode).toEqual(400);
    expect(res.body.success).toBe(false);
  });

  it('GET /api/attendance/logs should read file system logs successfully', async () => {
    const res = await request(app).get('/api/attendance/logs');
    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.logs)).toBe(true);
  });
});

