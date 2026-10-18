// The game rules live in shared/game.js, which the server uses too, so no rule
// is ever written twice. This file just passes them on, so pages can keep
// importing '../game'.
export * from '../../shared/game.js'
