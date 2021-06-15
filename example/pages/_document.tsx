import React from 'react'
import Document, {
	Head,
	Main,
	NextScript,
	DocumentContext,
	DocumentInitialProps,
} from 'next/document'
import { extractStyles } from 'evergreen-ui'
import * as snippet from '@segment/snippet'

interface Props extends Document {
	css: string
	hydrationScript: string
}

export default class SSRDoc extends Document<Props> {
	// Inject Evergreen's styles so that Next can perform SSR with it.
	public static getInitialProps({ renderPage }: DocumentContext): Promise<DocumentInitialProps> {
		const page = renderPage()
		const { css, hydrationScript } = extractStyles()

		return {
			...page,
			css,
			hydrationScript,
		} as any
	}

	public render() {
		const { css, hydrationScript } = this.props

		const globalStyles = `
      html {
        height: '100%';
      }
      body {
        height: '100%';
        background: rgb(247, 248, 250);
        margin: 0;
      }
    `

		
		const snippetFn = process.env.NODE_ENV === 'production' ? snippet.min : snippet.max
		const analyticsSnippet = snippetFn({
			apiKey: 'ZgsqNXhzqQ3nBsvPGXqZQn2RWoGBhlqC',
			page: false,
		})

		return (
			<html>
				<Head>
					<style dangerouslySetInnerHTML={{ __html: css }} />
					<style>{globalStyles}</style>
				</Head>

				<body>
					<Main />
					{hydrationScript}
					<NextScript />

					<script dangerouslySetInnerHTML={{ __html: analyticsSnippet }} />
				</body>
			</html>
		)
	}
}
