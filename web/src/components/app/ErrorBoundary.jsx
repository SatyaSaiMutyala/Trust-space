/*
 * Catches a crash in one part of the app (a page or a drawer) so the rest keeps working instead of the whole
 * screen going blank. resetKey: when it changes (e.g. the user navigates), the boundary clears its error.
 */
import { Component } from 'react'
import { Btn, Panel } from '../ui/Layout'

export default class ErrorBoundary extends Component {
  state = { error: null, key: this.props.resetKey }

  static getDerivedStateFromError(error) { return { error } }

  static getDerivedStateFromProps(props, state) {
    return props.resetKey !== state.key ? { error: null, key: props.resetKey } : null
  }

  componentDidCatch(error, info) { console.error('Screen crashed:', error, info?.componentStack) }

  render() {
    const { error } = this.state
    if (!error) return this.props.children
    return (
      <Panel title={this.props.title || 'This screen could not be shown'} sub="The rest of TruSpace is still working.">
        <p style={{ margin: '0 0 12px' }} className="muted">{String(error?.message || error)}</p>
        <div className="actions">
          <Btn primary onClick={() => this.setState({ error: null })}>Try again</Btn>
          {this.props.onClose ? <Btn onClick={this.props.onClose}>Close</Btn> : null}
          <Btn onClick={() => location.reload()}>Reload app</Btn>
        </div>
      </Panel>
    )
  }
}
