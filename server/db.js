// Connects to MongoDB. If the database isn't running, it says what to do and
// keeps trying every 5 seconds, so you don't have to restart the server.

import mongoose from 'mongoose'

const RETRY_MS = 5000

export function isConnected() {
  return mongoose.connection.readyState === 1
}

export async function connect(uri) {
  while (true) {
    try {
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 3000 })
      console.log(`Connected to MongoDB: ${mongoose.connection.name}`)
      // Only watch for drops once connected; a failed first try also fires 'disconnected'.
      mongoose.connection.on('disconnected', () => {
        console.log('Lost the connection to MongoDB. If it stopped, run: brew services start mongodb-community')
      })
      mongoose.connection.on('reconnected', () => console.log('Reconnected to MongoDB.'))
      return
    } catch {
      console.log(
        `Can't reach MongoDB at ${uri}. Start it with: brew services start mongodb-community ` +
          `(trying again in ${RETRY_MS / 1000} seconds)`
      )
      await new Promise((resolve) => setTimeout(resolve, RETRY_MS))
    }
  }
}
