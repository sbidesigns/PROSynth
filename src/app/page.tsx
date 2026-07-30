'use client'

export default function Home() {
  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      overflow: 'hidden',
      margin: 0,
      padding: 0,
      background: '#0a0a0f'
    }}>
      <iframe
        src="/vst-plugin/index.html"
        title="PROSynth - Virtual Instrument Plugin"
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          display: 'block'
        }}
        sandbox="allow-scripts allow-same-origin allow-popups allow-modals"
      />
    </div>
  )
}
