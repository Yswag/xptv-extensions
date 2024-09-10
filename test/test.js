const { getConfig, getCards, getTracks, getPlayinfo, search } = require('../js/4kav')

;(async () => {
    // let appConfig = getConfig()
    // console.log(appConfig)

    let ext = {
        id: 1,
        url: 'https://4k-av.com/movie',
        page: 1,
    }
    // let cards = await getCards(ext)
    // console.log(JSON.stringify(cards, null, 2))

    // ext = {
    //     url: 'https://4k-av.com/tv/105883-fox-spirit-matchmaker-red-moon-pact-ep01/',
    // }
    // let tracks = await getTracks(ext)
    // console.log(tracks.list[0].tracks)

    // ext = {
    //     url: 'https://4k-av.com/tv/105883-fox-spirit-matchmaker-red-moon-pact-ep01',
    // }
    // let urls = await getPlayinfo(ext)
    // console.log(urls)

    ext = {
        text: '我',
    }
    let searchResult = await search(ext)
    console.log(JSON.stringify(searchResult, null, 2))
})()
