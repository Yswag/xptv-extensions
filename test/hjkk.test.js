const { getConfig, getCards, getTracks, getPlayinfo, search } = require('../js/hjkk')
jest.setTimeout(30000)

describe('韓劇看看測試', () => {
    test('get config', () => {
        const appConfig = getConfig()
        expect(appConfig).toBeDefined()
        expect(appConfig).toHaveProperty('title')
        expect(appConfig).toHaveProperty('site')
        expect(appConfig).toHaveProperty('tabs')
        expect(Array.isArray(appConfig.tabs)).toBe(true)
        // console.log(appConfig)
    })

    test('get cards', async () => {
        const ext = {
            id: 1,
            url: 'https://www.hanjukankan.com/xvs@id@xatxbtxctxdtxetxftxgtxht@page@atbtct.html',
            page: 1,
        }
        const cards = await getCards(ext)
        expect(cards).toBeDefined()
        expect(Array.isArray(cards.list)).toBe(true)
        // console.log(cards)
    })

    test('get tracks', async () => {
        const ext = {
            url: 'https://www.hanjukankan.com/xvd1031.html',
        }
        const tracks = await getTracks(ext)
        expect(tracks).toBeDefined()
        expect(tracks.list).toBeDefined()
        expect(Array.isArray(tracks.list[0].tracks)).toBe(true)
        // console.log(tracks.list[0].tracks)
    })

    test('get play info', async () => {
        const ext = {
            url: 'https://www.hanjukankan.com/xvp1031xv1xvv1.html',
        }
        const urls = await getPlayinfo(ext)
        expect(urls).toBeDefined()
        // console.log(urls)
    })

    test('get search result', async () => {
        const ext = {
            text: '我',
        }
        const searchResult = await search(ext)
        expect(searchResult).toBeDefined()
        expect(Array.isArray(searchResult.list)).toBe(true)
        // console.log(searchResult)
    })
})
