const request = require('supertest')
const express = require('express')

jest.mock('../src/services/authservice', () => ({
  requireAuth: () => (req, res, next) => {
    req.user = { id: 'user1', role: 'CUSTOMER' }
    next()
  },
}))

jest.mock('../src/server', () => ({
  prisma: {
    booking: { findUnique: jest.fn() },
    receipt: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
  },
}))

const { prisma } = require('../src/server')
const receiptRoutes = require('../src/routes/receipt.routes').default

const app = express()
app.use(express.json())
app.use('/api/v1/receipts', receiptRoutes)

describe('Receipt Routes', () => {
  beforeEach(() => {
    prisma.booking.findUnique.mockReset()
    prisma.receipt.create.mockReset()
    prisma.receipt.findUnique.mockReset()
  })

  test('POST /receipts requires file', async () => {
    prisma.booking.findUnique.mockResolvedValue({ id: 'b1', customerId: 'user1', property: { hostId: 'host1' } })
    const res = await request(app)
      .post('/api/v1/receipts')
      .field('bookingId', 'b1')
      .field('amount', '100')
      .field('paymentMethod', 'transfer')
    expect(res.status).toBe(400)
  })

  test('GET /receipts/:id returns receipt', async () => {
    prisma.receipt.findUnique.mockResolvedValue({
      id: 'r1',
      uploadedBy: 'user1',
      booking: { customerId: 'user1', property: { hostId: 'host1' } },
    })
    const res = await request(app).get('/api/v1/receipts/r1')
    expect(res.status).toBe(200)
  })
})
