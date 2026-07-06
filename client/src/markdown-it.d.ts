declare module 'markdown-it' {
  interface Options {
    html?: boolean
    linkify?: boolean
    typographer?: boolean
    breaks?: boolean
  }

  class MarkdownIt {
    constructor(options?: Options)
    render(src: string, env?: object): string
  }

  export default MarkdownIt
}
