import { Component, type ReactNode } from "react";

export class AppErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div role="alert" style={{ padding: 24 }}>
        <p>页面加载失败，请刷新后重试。</p>
        <button type="button" onClick={() => window.location.reload()}>刷新页面</button>
      </div>
    );
  }
}
