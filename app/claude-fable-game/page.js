'use client';

import { useEffect } from 'react';
import './game.css';

export default function ClaudeFableGame() {
  useEffect(() => {
    let cleanup = null;
    let cancelled = false;
    import('./game').then((m) => {
      if (cancelled) return;
      cleanup = m.initGame();
    });
    return () => {
      cancelled = true;
      if (cleanup) cleanup();
    };
  }, []);

  return (
    <>
      <div id="app" />

      {/* HUD */}
      <div id="hud">
        <div id="mute-ind" />
        <div id="hp-wrap">
          <div id="hp-label">VITALITY</div>
          <div id="hp-outer"><div id="hp-fill" /><div id="hp-ghost" /></div>
        </div>
        <div id="stats"><div id="score">0</div><div id="wave-label" /></div>
        <div id="combo" />
        <div id="bossbar"><div id="boss-name" /><div id="boss-outer"><div id="boss-fill" /></div></div>
        <div id="hint"><b>WASD</b> move &nbsp;·&nbsp; <b>F / CLICK</b> attack &nbsp;·&nbsp; <b>E / R-CLICK</b> heavy &nbsp;·&nbsp; <b>SPACE</b> dodge &nbsp;·&nbsp; <b>ESC</b> pause &nbsp;·&nbsp; <b>M</b> mute</div>
      </div>
      <div id="bars" />
      <div id="banner"><div id="banner-main" /><div id="banner-sub" /></div>
      <div id="vignette" />
      <div id="lowhp" />
      <div id="flash" />

      {/* LOADING */}
      <div id="screen-loading" className="screen">
        <div className="title" style={{ fontSize: 'clamp(34px,5vw,56px)' }}>BLADEFALL</div>
        <div id="loadbar-wrap"><div id="loadbar" /></div>
        <div id="loadtext">INITIALIZING</div>
        <div id="loadtip" />
      </div>

      {/* TITLE */}
      <div id="screen-title" className="screen hidden">
        <div className="title">BLADEFALL</div>
        <div className="subtitle">Arena of the Fallen</div>
        <button className="btn" id="btn-start">Enter the Arena</button>
        <div className="controls-hint">
          <b>W A S D</b> &nbsp;move &nbsp;&nbsp;&nbsp; <b>F</b> / <b>CLICK</b> &nbsp;attack (chain 3-hit combos)<br />
          <b>E</b> / <b>RIGHT-CLICK</b> &nbsp;heavy strike &nbsp;&nbsp;&nbsp; <b>SPACE</b> &nbsp;dodge roll (invincible) &nbsp;&nbsp;&nbsp; <b>M</b> &nbsp;mute<br />
          <span style={{ color: '#4d5470' }}>(J / K still work too)</span>
        </div>
        <a href="/blogs" style={{ marginTop: 28, color: '#555d7c', fontSize: 12, letterSpacing: '.3em', textDecoration: 'none', textTransform: 'uppercase' }}>
          Read the build log →
        </a>
      </div>

      {/* LEVEL INTRO */}
      <div id="screen-level" className="screen hidden" style={{ background: 'rgba(5,6,10,.88)' }}>
        <div className="subtitle" id="level-num" style={{ marginBottom: 10 }} />
        <div className="title" id="level-name" style={{ fontSize: 'clamp(30px,5vw,58px)' }} />
        <div className="subtitle" id="level-flavor" style={{ marginTop: 24, letterSpacing: '.3em' }} />
      </div>

      {/* PAUSE */}
      <div id="screen-pause" className="screen hidden" style={{ background: 'rgba(5,6,10,.82)' }}>
        <div className="title" style={{ fontSize: 44 }}>PAUSED</div>
        <div className="menu-spacer" />
        <button className="btn" id="btn-resume">Resume</button>
        <button className="btn" id="btn-retry-pause">Restart Level</button>
        <button className="btn" id="btn-quit">Main Menu</button>
      </div>

      {/* GAME OVER */}
      <div id="screen-dead" className="screen hidden" style={{ background: 'rgba(10,4,6,.9)' }}>
        <div className="title death-title" style={{ fontSize: 'clamp(40px,7vw,80px)' }}>YOU DIED</div>
        <div className="menu-spacer" />
        <div className="stat-line">SCORE &nbsp;<b id="dead-score">0</b></div>
        <div className="stat-line">FELL AT &nbsp;<b id="dead-level" /></div>
        <div className="menu-spacer" />
        <button className="btn" id="btn-retry">Retry Level</button>
        <button className="btn" id="btn-dead-menu">Main Menu</button>
      </div>

      {/* VICTORY */}
      <div id="screen-win" className="screen hidden" style={{ background: 'rgba(8,8,4,.9)' }}>
        <div className="title win-title" style={{ fontSize: 'clamp(36px,6vw,72px)' }}>CHAMPION</div>
        <div className="subtitle">The arena falls silent</div>
        <div className="stat-line">FINAL SCORE &nbsp;<b id="win-score">0</b></div>
        <div className="stat-line">BEST COMBO &nbsp;<b id="win-combo">0</b></div>
        <div className="menu-spacer" />
        <button className="btn" id="btn-again">Fight Again</button>
        <button className="btn" id="btn-win-menu">Main Menu</button>
      </div>
    </>
  );
}
