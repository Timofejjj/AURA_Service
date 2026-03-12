module.exports = {
    printWidth: 80,
    tabWidth: 4,
    useTabs: false,
    semi: true,
    singleQuote: true,

    bracketSpacing: true,
    trailingComma: 'es5',

    jsxSingleQuote: false,
    bracketSameLine: false,

    arrowParens: 'always',

    plugins: [
        '@trivago/prettier-plugin-sort-imports',
        'prettier-plugin-tailwindcss',
    ],

    importOrder: [
        '^react(.*)',
        '<THIRD_PARTY_MODULES>',
        '^@/components/(.*)$',
        '^@/lib/(.*)$',
        '^[./]',
    ],
    importOrderSeparation: true,
    importOrderSortSpecifiers: true,
};