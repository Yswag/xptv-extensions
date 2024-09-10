const { getConfig, getCards, getTracks, getPlayinfo, search } = require('../js/4kav')

describe('4kav測試', () => {
    test('get config', () => {
        const appConfig = getConfig()
        expect(appConfig).toBeDefined()
        expect(appConfig).toHaveProperty('title')
        expect(appConfig).toHaveProperty('site')
        expect(appConfig).toHaveProperty('tabs')
        expect(Array.isArray(appConfig.tabs)).toBe(true)
        console.log(appConfig)
    })

    test('get cards', async () => {
        const ext = {
            id: 1,
            url: 'https://4k-av.com/movie',
            page: 1,
        }
        const cards = await getCards(ext)
        expect(cards).toBeDefined()
        expect(Array.isArray(cards.list)).toBe(true)
        console.log(cards)
    })

    test('get tracks', async () => {
        const ext = {
            url: 'https://4k-av.com/tv/105883-fox-spirit-matchmaker-red-moon-pact-ep01/',
        }
        const tracks = await getTracks(ext)
        expect(tracks).toBeDefined()
        expect(tracks.list).toBeDefined()
        expect(Array.isArray(tracks.list[0].tracks)).toBe(true)
        console.log(tracks.list[0].tracks)
    })

    test('get play info', async () => {
        const ext = {
            url: 'https://4k-av.com/tv/105883-fox-spirit-matchmaker-red-moon-pact-ep01',
        }
        const urls = await getPlayinfo(ext)
        expect(urls).toBeDefined()
        console.log(urls)
    })

    test('get search result', async () => {
        const ext = {
            text: '我',
        }
        const searchResult = await search(ext)
        expect(searchResult).toBeDefined()
        expect(Array.isArray(searchResult.list)).toBe(true)
        console.log(searchResult)
    })
})
