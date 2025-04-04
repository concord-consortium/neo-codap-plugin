# wms-capabilities.xml
This was downloaded from: https://neo.gsfc.nasa.gov/wms/wms?version=1.3.0&service=WMS&request=GetCapabilities

This info is supposed to be decommissioned soon so it might not be available anymore.

# NEO Web Mapping Service
It is still possible to get some images from the NEO WMS.

For example this worked:
https://neo.gsfc.nasa.gov/wms/wms?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&BBOX=-180%2C-90%2C180%2C90&CRS=CRS%3A84&WIDTH=764&HEIGHT=384&LAYERS=TRMM_3B43M&STYLES=&FORMAT=image%2Fpng&DPI=144&MAP_RESOLUTION=144&FORMAT_OPTIONS=dpi%3A144&TRANSPARENT=TRUE

And it could be shortened and would still work:
https://neo.gsfc.nasa.gov/wms/wms?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&BBOX=-180%2C-90%2C180%2C90&CRS=CRS%3A84&WIDTH=764&HEIGHT=384&LAYERS=TRMM_3B43M&STYLES=&FORMAT=image%2Fpng

However the "layer" here is the old rainfall data `TRMM_3B43M`. The new rainfall data layer is `GPM_3IMERGM`. Fetching this layer with wms didn't work:
https://neo.gsfc.nasa.gov/wms/wms?VERSION=1.3.0&REQUEST=GetMap&LAYERS=GPM_3IMERGM&STYLES=rgb&CRS=CRS:84&BBOX=-180,-90,180,90&WIDTH=720&HEIGHT=360&FORMAT=image/png

Sometimes it returns a blank screen sometimes it returns a 500 error.

In theory a `TIME` parameter can be sent to get the image of the layer at a specific time. I didn't try this, but I suspect it will would work in some cases.

## Conclusion
This was useful to learn more about. However it seems like a dead-end:
- The service is supposed to be shut down soon
- The model of WMS itself doesn't seem to fit well with low budget places like government sites. It allows a user to specify any pixel dimensions, and if supported any lat,long area. This would require a server to handle these requests and each request would be pretty intensive.
- Not all of the layers worked.