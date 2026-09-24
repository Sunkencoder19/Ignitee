import { Component } from 'react'
import { RotateCcw, TriangleAlert } from 'lucide-react'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'

// Class component because React still has no hook for catching render errors.
// Layouts key this by pathname, so moving to another page clears the error.
export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('Page crashed:', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <EmptyState
        icon={TriangleAlert}
        title="Something went wrong on this page"
        message="Try again. If it keeps happening, go back and pick another page."
        action={
          <Button icon={RotateCcw} onClick={() => this.setState({ error: null })}>
            Try again
          </Button>
        }
      />
    )
  }
}
