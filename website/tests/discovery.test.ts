import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const anime={id:42,title:{english:'A distant world',romaji:'Sekai',native:null},description:'A story',coverImage:{large:null},bannerImage:null,startDate:{year:2026,month:1,day:1},status:'FINISHED',genres:['Adventure'],averageScore:85,episodes:12}
const movie={id:12,title:'A new story',genre_ids:[28],vote_average:8.2,poster_path:'/cover.jpg'}
beforeEach(()=>vi.resetModules())
afterEach(()=>vi.unstubAllGlobals())

describe('discovery catalogue',()=>{
  it('maps movie results, sends the chosen filters and bounds pagination',async()=>{
    const fetch=vi.fn(async(_url:string)=>Response.json({results:[movie],total_pages:2}))
    vi.stubGlobal('fetch',fetch)
    const {discoverMedia}=await import('../src/server/metadata/discovery')
    const result=await discoverMedia({mediaType:'movie',mode:'top-rated',genre:'Action',year:2024,page:2},'test-key')
    expect(result).toMatchObject({page:2,hasNextPage:false,results:[{externalId:'12',title:'A new story',source:'tmdb',mediaType:'movie',rating:8.2,genres:['Action']}]})
    const query=new URL(fetch.mock.calls[0][0] as unknown as string).searchParams
    expect(Object.fromEntries(query)).toMatchObject({primary_release_year:'2024',with_genres:'28','vote_count.gte':'200',sort_by:'vote_average.desc',include_adult:'false',page:'2'})
  })
  it('browses anime without a TMDB key and uses AniList scores and pagination',async()=>{
    const fetch=vi.fn(async()=>Response.json({data:{Page:{media:[anime],pageInfo:{hasNextPage:true}}}}))
    vi.stubGlobal('fetch',fetch)
    const {discoverMedia}=await import('../src/server/metadata/discovery')
    const result=await discoverMedia({mediaType:'anime',mode:'upcoming',genre:'Adventure',year:2027})
    expect(result).toMatchObject({page:1,hasNextPage:true,results:[{source:'anilist',mediaType:'anime',rating:8.5}]})
    const body=JSON.parse((fetch.mock.calls[0] as unknown as [string,RequestInit])[1].body as string)
    expect(body.variables).toMatchObject({status:'NOT_YET_RELEASED',year:2027,genre:'Adventure'})
    expect(body.query).toContain('isAdult:false')
  })
  it('fails clearly for missing film configuration and GraphQL failures',async()=>{
    const {discoverMedia}=await import('../src/server/metadata/discovery')
    await expect(discoverMedia({mediaType:'movie',mode:'popular'})).rejects.toThrow('TMDB API key')
    vi.stubGlobal('fetch',vi.fn(async()=>Response.json({data:null,errors:[{message:'Unavailable'}]})))
    await expect(discoverMedia({mediaType:'anime',mode:'popular'})).rejects.toThrow('AniList could not load')
  })
  it.each([
    {mediaType:'movie',mode:'popular',page:1.5},
    {mediaType:'movie',mode:'popular',page:101},
    {mediaType:'movie',mode:'popular',genre:'invalid'},
    {mediaType:'tv',mode:'popular',genre:'Horror'},
    {mediaType:'anime',mode:'popular',year:0},
    {mediaType:'invalid',mode:'popular'},
    {mediaType:'movie',mode:'invalid'}
  ])('rejects invalid catalogue input before requesting a provider: %j',async request=>{
    const fetch=vi.fn();vi.stubGlobal('fetch',fetch)
    const {discoverMedia}=await import('../src/server/metadata/discovery')
    await expect(discoverMedia(request,'test-key')).rejects.toThrow()
    expect(fetch).not.toHaveBeenCalled()
  })
})

describe('recommendations and streaming availability',()=>{
  it('keeps valid viewing information when recommendations fail',async()=>{
    vi.stubGlobal('fetch',vi.fn(async(url:string)=>url.includes('/recommendations')?Response.json({}, {status:404}):Response.json({results:{MA:{link:'https://www.themoviedb.org/movie/12/watch?locale=MA',flatrate:[{provider_id:8,provider_name:'Netflix',logo_path:'/netflix.jpg'}]}}})))
    const {getTitleExtras}=await import('../src/server/metadata/discovery')
    const result=await getTitleExtras({source:'tmdb',mediaType:'movie',externalId:'12',country:'MA'},'test-key')
    expect(result.recommendations).toEqual([])
    expect(result.recommendationError).toBeTruthy()
    expect(result.availabilityError).toBeNull()
    expect(result.availability).toMatchObject({country:'MA',attribution:'JustWatch',groups:[{type:'stream',providers:[{name:'Netflix'}]}]})
  })
  it('never substitutes another country and deduplicates providers within each offer',async()=>{
    const {mapAvailability}=await import('../src/server/metadata/discovery')
    const provider={provider_id:8,provider_name:'Netflix',logo_path:null}
    expect(mapAvailability({US:{flatrate:[provider]}},'MA').groups).toEqual([])
    const result=mapAvailability({US:{link:'javascript:alert(1)',flatrate:[provider,provider],buy:[provider]}},'US')
    expect(result.groups.map(group=>[group.type,group.providers.length])).toEqual([['stream',1],['buy',1]])
    expect(result.link).toBeNull()
    expect(result.note).toContain('JustWatch')
  })
  it('returns anime recommendations and labels streaming links as region-independent',async()=>{
    vi.stubGlobal('fetch',vi.fn(async()=>Response.json({data:{Media:{recommendations:{nodes:[{mediaRecommendation:{...anime,isAdult:false}},{mediaRecommendation:{...anime,id:99,isAdult:true}},{mediaRecommendation:null}]},externalLinks:[{site:'Crunchyroll',url:'https://www.crunchyroll.com/series/test',type:'STREAMING'},{site:'Unsafe',url:'javascript:alert(1)',type:'STREAMING'},{site:'Disabled',url:'https://example.com',type:'STREAMING',isDisabled:true},{site:'Official',url:'https://example.com',type:'INFO'}]}}})))
    const {getTitleExtras}=await import('../src/server/metadata/discovery')
    const result=await getTitleExtras({source:'anilist',mediaType:'anime',externalId:'42',country:'MA'})
    expect(result.recommendations).toHaveLength(1)
    expect(result.availability?.animeLinks).toEqual([{name:'Crunchyroll',url:'https://www.crunchyroll.com/series/test'}])
    expect(result.availability?.note).toContain('not country-specific')
  })
  it('rejects source mismatches, path injection and malformed country codes',async()=>{
    const {validateExtras}=await import('../src/server/metadata/discovery')
    for(const request of [{source:'tmdb',mediaType:'anime',externalId:'42',country:'MA'},{source:'tmdb',mediaType:'movie',externalId:'../settings',country:'MA'},{source:'tmdb',mediaType:'movie',externalId:'12',country:'MA&api_key=x'}])expect(()=>validateExtras(request)).toThrow()
  })
})
