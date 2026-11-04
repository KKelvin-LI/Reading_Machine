export const homeTemplate = `
  <section id="home" class="home design-frame refined-home" aria-label="The Reading Machine home">
    <div class="grid-guide" aria-hidden="true">${'<i></i>'.repeat(8)}</div>
    <header class="home-identity">
      <a class="home-wordmark" href="#" aria-label="The Reading Machine home">
        <img data-eaty-front alt="" />
        <span>THE READING MACHINE</span>
      </a>
      <nav class="home-navigation" aria-label="Main navigation">
        <button type="button" data-native-control aria-disabled="true">ABOUT</button>
        <button type="button" data-native-control aria-disabled="true">READING HISTORY</button>
      </nav>
    </header>
    <button class="home-account" type="button" data-native-control aria-label="Account — coming later" aria-disabled="true">K</button>
    <main class="home-upload">
      <button id="choose-file" class="frog-upload" type="button" data-native-control aria-label="Click or drag to upload a PDF file" aria-describedby="home-upload-status">
        <span id="frog-scene" aria-hidden="true"></span>
        <span class="frog-fallback" aria-hidden="true"><span>CLICK OR DRAG<br>TO UPLOAD FILE</span></span>
      <span class="frog-caption">CLICK OR DRAG TO UPLOAD FILE</span>
      <span id="home-upload-status" class="home-upload-status" role="status" aria-live="polite"></span></button>

    </main>
    <div id="session-library" hidden><div id="document-list"></div></div>
  </section>`;
