const { getConfig, getCards, getTracks, getPlayinfo, search } = require('../js/jpyy')
jest.setTimeout(30000)

describe('金牌影院測試', () => {
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
            url: 'https://www.ghw9zwp5.com/api/mw-movie/anonymous/video/list?pageNum=@page@&pageSize=30&sort=1&sortBy=1&type1=@type@',
            page: 1,
        }
        const cards = await getCards(ext)
        expect(cards).toBeDefined()
        expect(Array.isArray(cards.list)).toBe(true)
    })

    test('get tracks', async () => {
        const ext = {
            url: 'https://www.ghw9zwp5.com/detail/126245',
        }
        const tracks = await getTracks(ext)
        expect(tracks).toBeDefined()
        expect(tracks.list).toBeDefined()
        expect(Array.isArray(tracks.list[0].tracks)).toBe(true)
    })

    test('get play info', async () => {
        const ext = {
            url: 'https://www.ghw9zwp5.com/vod/play/126245/sid/1058411',
        }
        const urls = await getPlayinfo(ext)
        expect(urls).toBeDefined()
    })

    test('get search result', async () => {
        const ext = {
            text: '我',
            page: 1,
        }
        const searchResult = await search(ext)
        expect(searchResult).toBeDefined()
        expect(Array.isArray(searchResult.list)).toBe(true)
    })
})
