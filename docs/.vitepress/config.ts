import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'Spanwright',
  description: 'Cloud Spanner E2E testing framework generator',
  base: '/spanwright/',

  themeConfig: {
    logo: '/logo.svg',

    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'API', link: '/api/cli-commands' },
      { text: 'Examples', link: '/examples/tutorials' },
      {
        text: 'v2.3.0',
        items: [
          { text: 'Changelog', link: '/changelog' },
          { text: 'GitHub', link: 'https://github.com/nu0ma/spanwright' },
        ],
      },
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'Getting Started',
          items: [
            { text: 'Introduction', link: '/guide/introduction' },
            { text: 'Quick Start', link: '/guide/getting-started' },
            { text: 'Installation', link: '/guide/installation' },
            { text: 'Project Structure', link: '/guide/project-structure' },
          ],
        },
        {
          text: 'Usage',
          items: [
            { text: 'Schema Management', link: '/guide/schema-management' },
            { text: 'Writing Tests', link: '/guide/writing-tests' },
            { text: 'Database Seeding', link: '/guide/database-seeding' },
            { text: 'Validation', link: '/guide/validation' },
          ],
        },
        {
          text: 'Advanced',
          items: [
            { text: 'Multi-Database Setup', link: '/guide/multi-database' },
            { text: 'CI/CD Integration', link: '/guide/ci-cd' },
            { text: 'Troubleshooting', link: '/guide/troubleshooting' },
          ],
        },
      ],
      '/api/': [
        {
          text: 'Reference',
          items: [
            { text: 'CLI Commands', link: '/api/cli-commands' },
            { text: 'Makefile Targets', link: '/api/makefile-targets' },
            { text: 'Configuration', link: '/api/configuration' },
          ],
        },
      ],
      '/examples/': [
        {
          text: 'Examples',
          items: [
            { text: 'Basic Tutorial', link: '/examples/tutorials' },
            { text: 'Multi-Database', link: '/examples/multi-database' },
            { text: 'Real-world Scenarios', link: '/examples/real-world' },
          ],
        },
      ],
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/nu0ma/spanwright' },
      { icon: 'npm', link: 'https://www.npmjs.com/package/spanwright' },
    ],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2024 nu0ma',
    },

    editLink: {
      pattern: 'https://github.com/nu0ma/spanwright/edit/main/docs/:path',
      text: 'Edit this page on GitHub',
    },

    search: {
      provider: 'local',
    },
  },

  head: [
    ['link', { rel: 'icon', href: '/spanwright/favicon.ico' }],
    ['meta', { property: 'og:title', content: 'Spanwright' }],
    [
      'meta',
      { property: 'og:description', content: 'Cloud Spanner E2E testing framework generator' },
    ],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:url', content: 'https://nu0ma.github.io/spanwright/' }],
  ],
});
