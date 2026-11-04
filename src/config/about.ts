/** EDIT HERE: colours, copy and motion. [letter:colour] uses your inflated mesh. */
export const aboutSettings = {
  secondsPerLoop: 12,
  closingSpeedMultiplier: 5, // 400% faster after the closing press finishes.
  buttonColour: '#bae4ee',
  buttonLetterColour: '#f7c9de',
  buttonDentDepth: .3, // Depth as a fraction of button height.
  pressSeconds: 1, // Total visible press, hold and release duration.
  creaseReach: 0.6, // 1 = creases reach the edge; .8 = stop at 80%.
  creaseDepth: .025, // Crease depth as a fraction of button height.
  alphabetUrl: 'models/about/inflated-alphabet.glb',
  buttonUrl: 'models/about/squishy-navigation.glb',
  spriteUrl: 'models/about/sprites/',
  palette: { pink:'#f7c9de', lilac:'#bda7d0', green:'#69bf64', orange:'#f89823', sky:'#bae4ee', yellow:'#fcf068', blue:'#326eb3', red:'#e7484d' },
  lines: [
    'WELC[O:pink]ME TO A LI[T:yellow]TLE',
    'WORLD O[F:sky] LES[S:green] STRESS',
    '[A:lilac]ND MORE [R:orange]EADING JO[Y:blue].',
    'OUR [P:red]HILOSOPHY [I:pink]S IF',
    'R[E:yellow]ADING FEE[L:sky]S BORI[N:green]G',
    'OR [D:lilac]IFFI[C:orange]ULT, [W:blue]HY NO[T:red]',
    '[M:pink]AKE I[T:yellow] PLAY[F:sky]UL?',
    'SQ[U:green]ISH, ST[R:lilac]ETCH A[N:orange]D',
    'JUST [S:blue]IMPLY H[A:red]VE FUN[!:pink]',
  ],
};
