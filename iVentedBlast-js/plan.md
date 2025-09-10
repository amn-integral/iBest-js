The src/lib holds the functions for 3d rendering using 3js

The core functionality is divided into following parts

# src/lib/geometery
    - index.ts - Export the types and functions
    - types.ts - Types for all the functions
    - plane-native.ts - Functions to draw the planes
    - cubicle-native.ts - Functions to draw cubicle using plane-native.ts

# src/lib/geometry/plane-native.ts

The file has following export functions:

    - makePlane (opts: PlaneOptions) // Make a plabe with or without opening
        Makes the plane by accepting following arguments:
            width: number, // width of plane
            h: number,     // height of plane
            normal: THREE.Vector3, // normal vector of plane
            pos: THREE.Vector3, // starting location of the plane
            offset: number = 0, // Offset plane from start by this amount
            material?: THREE.Material // material of the plane
            opening? HoleOpening // opening size for the hole. {x: x position, y: yposition, h: height of opening, w: width of opening}
    
# src/lib/geometry/cubicle-native

The file has following export functions:
    
    - makeCubicle (opts: CubicleOptions)
        The cubicle functions make a cubicle which can be added tothe scene. By default the 
        cubicle draws are all six sides {ground, ceiling, left, right, front, back}. The 
        dimensions are based on supplying length, width and height. The makeCubicle uses
        makePlane function function to draw all six planes. Additionaly, the function accepts a list of strings for which sides and also accepts parameters that will tell which side
        has the hole.

# src/lib/colors/index.ts

