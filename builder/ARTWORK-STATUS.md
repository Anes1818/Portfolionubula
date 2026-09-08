# Artwork and realism

The runtime contains 96 RGBA WebP images. Flowers, paper collars, ribbons and decorative lettering come from the supplied image library and generated-photo attachments; no extra paid flowers are invisibly generated.

Classic uses the retained ivory wrap master / matching front mask and source-aligned bloom / stem pairs. The 27 stemmed entries overlap by eight source pixels at the crop boundary and use the same transform. Stemless compact/medium filler is tucked into the cup; chocolate is not offered as a stemmed Classic asset.

Matched pink lily, white gerbera, cream ranunculus and white hydrangea photographs are used, alongside the new compact/medium filler and black Dome/Heart collars. Source PNGs and unmodified source-library files are retained for development. `artwork/v6-connections.json` records source hashes and join boundaries; `asset-meta.js` includes measured head alpha radius.

Dome/Heart pictures are genuinely separate templates. The heart is flat, using v1-derived wall/fill/center membership, not a dome depth gradient. The Dome starts from v2 and is refined for spacing. Individual flower central regions are protected by geometry; natural petal overlap is intentional. A flower asset can depict a multi-bloom stem/cluster, not necessarily one biological bloom.

Limitations: alpha bounds are an image-space safeguard, not an assembly guarantee. Dense mixtures can still be impractical or need different stems in the real shop. Small hearts describe their silhouette less precisely than larger templates. Digital paper colour changes and image lettering are previews, not proof of available stock. The florist must approve the final material choices and real arrangement.
