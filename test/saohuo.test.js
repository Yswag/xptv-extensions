const { getConfig, getCards, getTracks, getPlayinfo, search } = require('../js/saohuo')

describe('燒火測試', () => {
    test('get config', () => {
        const appConfig = getConfig()
        expect(appConfig).toBeDefined()
        expect(appConfig).toHaveProperty('title')
        expect(appConfig).toHaveProperty('site')
        expect(appConfig).toHaveProperty('tabs')
        expect(Array.isArray(appConfig.tabs)).toBe(true)
    })

    test('get cards', async () => {
        const ext = {
            id: 1,
            url: 'https://saohuo.tv/list/@id@-@page@.html',
            page: 1,
        }
        const cards = await getCards(ext)
        expect(cards).toBeDefined()
        expect(Array.isArray(cards.list)).toBe(true)
    })

    test('get tracks', async () => {
        const ext = {
            url: 'https://saohuo.tv/movie/48430.html',
        }
        const tracks = await getTracks(ext)
        expect(tracks).toBeDefined()
        expect(tracks.list).toBeDefined()
        expect(Array.isArray(tracks.list[0].tracks)).toBe(true)
    })

    test('get play info', async () => {
        const ext = {
            url: 'https://saohuo.tv/play/48430-0-0.html',
        }
        const urls = await getPlayinfo(ext)
        expect(urls).toBeDefined()
    })

    test('get search result', async () => {
        const ext = {
            text: '我們',
            page: 1,
        }
        const searchResult = await search(ext)
        expect(searchResult).toBeDefined()
        expect(Array.isArray(searchResult.list)).toBe(true)
    })
})
