## OVERALL

- Should either replace all "kind" with "mediaType" or all "mediaType" with "kind" -> now it is mixed
- Don't use the term "family" -> use "kind"

---

### Mediadle

- MovieMediadleCatalogQuery -> Don't think it need to be a class...
- But MediadleService depends on it directly...
- Does it need to be in the media module, like it is only used as a dep for MediadleService...
- But we should group all same media type stuff together...
- I don't know...

### WCF game

- Way more complicated than it should be <Media>WcfQuery does not need to be a class
- WcfService call mediaModule to get the popular refs from <Media>WcfQuery -> makes sense
- but also use a cards WcfMediaCardQuery which is just "findById" with a kind (mediaType)
- and is only called in the <Media>WcfQuery, could be directly on the WcfService / WcfRepository
- where you just pass the id and kind and that's it... So it removes a file, and the <Media>WcfQuery
- became simple objects with a createWcfQuery functional factory approach
