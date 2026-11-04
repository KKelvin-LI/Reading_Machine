export const readerTemplate = `
<section id="reader" class="reader design-frame" hidden aria-label="PDF reader">
  <div class="grid-guide" aria-hidden="true">${'<i></i>'.repeat(8)}</div>
  <header class="reading-brand-row">
    <button id="back-home" data-native-control class="reading-brand" aria-label="Return to home">
      <img data-eaty-front alt="" />
      <span>THE READING MACHINE</span>
    </button>
    <button id="reader-close" data-native-control class="reading-close" aria-label="Close reader and return home"><img alt="" /></button>
  </header>
  <div class="reading-window">
    <aside class="reading-sidebar" aria-label="Reading tools">
      <section class="reading-tools"><h2><button id="reading-tools-toggle" type="button" data-native-control aria-label="Unlocked tools"><span class="reading-tools-label">UNLOCKED TOOLS</span></button></h2><div id="reading-tool-list"></div><span class="reading-tools-model" aria-hidden="true"></span></section>
      <h2 class="reading-highlights"><button id="highlights-toggle" data-native-control aria-label="Highlights" aria-expanded="false" aria-controls="highlights-panel"><span class="about-button-label">HIGHLIGHTS</span><span class="about-button-model" aria-hidden="true"></span></button></h2>
      <span id="reader-unlock-status" class="reader-sr-only" role="status"></span>
    </aside>
    <main id="page-stage" class="page-stage" tabindex="0" aria-label="PDF pages — scroll to read">
      <div id="page-mount"></div>
    </main>
    <footer class="reading-progress-footer">
      <div id="reading-progress" role="progressbar" aria-label="Reading progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"></div>
      <button id="reading-replay" type="button" data-native-control disabled aria-label="Replay Eaty’s finishing animation" title="Replay finishing animation"></button>
      <output id="reading-percent">0%</output>
    </footer>
  </div>
  <!-- Kept as an extension anchor for the existing squishy cursor module. -->
  <div class="reader-toolbar" hidden></div>
</section>`;
