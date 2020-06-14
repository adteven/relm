import stampit from 'stampit'

import { EntityShared } from './entity_shared.js'
import { Component } from './components/component.js'
import { HasObject } from './components/has_object.js'
import { HasEmissiveMaterial } from './components/has_emissive_material.js'
import { ReceivesPointer } from './receives_pointer.js'
import { LoadsAsset } from './components/loads_asset.js'
import { AnimatesScale } from './components/animates_scale.js'
import { AnimatesRotation } from './components/animates_rotation.js'
import { AnimatesPosition } from './components/animates_position.js'
import { UsesAssetAsGltf } from './components/uses_asset_as_gltf.js'

const DEFAULT_SIZE = 100

/**
 * Returns a ratio that can be used to multiply by the object's current size so as to
 * scale it up or down to the desired largestSide size.
 * 
 * @param {Object3D} object3d The THREE.Object3D whose size is of interest
 * @param {number} largestSide The size of the desired "largest side" after scaling
 */
const getScaleRatio = (object3d, largestSide) => {
  const bbox = new THREE.Box3().setFromObject(object3d)
  let size = new THREE.Vector3()
  bbox.getSize(size)
  let ratio
  if (size.x > size.y && size.x > size.z) {
    ratio = largestSide / size.x
  } else if (size.x > size.z) {
    ratio = largestSide / size.y
  } else {
    ratio = largestSide / size.z
  }
  return ratio
}

const Thing3D = stampit(
  EntityShared,
  HasObject,
  LoadsAsset,
  UsesAssetAsGltf,
  AnimatesScale,
  AnimatesRotation,
  AnimatesPosition,
  HasEmissiveMaterial,
  ReceivesPointer,
  stampit(Component, {
    methods: {
      normalize() {
        const ratio = getScaleRatio(this.object, DEFAULT_SIZE)
        this.goals.scale.update({
          x: this.goals.scale.get('x') * ratio,
          y: this.goals.scale.get('y') * ratio,
          z: this.goals.scale.get('z') * ratio,
        })
      },
    }
  })
).setType('thing3d')

export { Thing3D }
