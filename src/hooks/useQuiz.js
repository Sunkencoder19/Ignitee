import { useMemo, useReducer } from 'react'
import { scoreQuiz } from '@/lib/scoring'

// One reducer for the whole quiz run: which question is showing, how each
// answered question went, and whether the child has reached the end.
// The two-tries-per-question logic lives in QuestionCard; this hook only
// hears the final outcome ('first' | 'hint' | 'missed') for each question.

const initialState = { index: 0, answers: [], finished: false }

function quizReducer(state, action) {
  switch (action.type) {
    case 'ANSWERED': {
      if (state.answers[state.index]) return state
      const answers = [...state.answers]
      answers[state.index] = action.answer
      return { ...state, answers }
    }
    case 'NEXT': {
      if (!state.answers[state.index]) return state
      const isLast = state.index === action.total - 1
      return isLast ? { ...state, finished: true } : { ...state, index: state.index + 1 }
    }
    case 'RESTART':
      return initialState
    default:
      return state
  }
}

export default function useQuiz(quiz) {
  const [state, dispatch] = useReducer(quizReducer, initialState)
  const total = quiz?.questions.length ?? 0

  const outcomes = useMemo(() => state.answers.map((a) => a.outcome), [state.answers])
  const result = useMemo(() => scoreQuiz(outcomes), [outcomes])

  return {
    question: quiz?.questions[state.index] ?? null,
    index: state.index,
    total,
    answers: state.answers,
    outcomes,
    currentAnswered: Boolean(state.answers[state.index]),
    isLast: state.index === total - 1,
    finished: state.finished,
    score: result.score,
    stars: result.stars,
    answered: (answer) => dispatch({ type: 'ANSWERED', answer }),
    next: () => dispatch({ type: 'NEXT', total }),
    restart: () => dispatch({ type: 'RESTART' }),
  }
}
