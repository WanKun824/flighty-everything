# 3D 模型来源与许可

`public/models/*.glb` 来自 `travel-map-vehicles` 预览项目的预处理产物，由 Three.js 加载（Draco 解码器仍在
`public/draco/`，当前这四个 GLB 都没有压缩，用不到）。

| 文件 | 用于 | 原始资产 | GLB 三角面 | 许可状态 |
| --- | --- | --- | ---: | --- |
| `porsche.glb` | 汽车 | `porsche_obj.rar` / OBJ | 11,999 | 未附许可文件；公开或商业分发前需由资产持有人确认权利 |
| `train.glb` | 火车 | `Train (1).rar` / Blend | 13,999 | 未附许可文件；公开或商业分发前需由资产持有人确认权利 |
| `boat.glb` | 轮船 | `Boat.blend` | 2,320 | 未附许可文件；公开或商业分发前需由资产持有人确认权利 |
| `legacy-plane.glb` | 飞机 | `3d-model.obj.zip` | 8,498 | 未附许可文件；公开或商业分发前需由资产持有人确认权利 |

表里是 GLB 文件本身的面数，决定下载体积。运行时 `app/vehicleShading.ts` 的 `curveModel` 还会按夹角自适应地
把弯曲处细分成曲面片，在屏面数是这个数的 2~3.5 倍。

之前的 `car.glb`（Kenney Car Kit 3.1 / `sedan-sports.glb`，CC0）与 `plane.glb` 已随本次替换移除；
`scripts/prepare_vehicle.py` 是生成那一批的 Blender 脚本，与当前这四个 GLB 无关。

材质处理：这四个 GLB 里只有 `train.glb` 自带材质（`map_body` 等六色），其余三个被预处理压成了单网格且
**不带任何材质**，颜色一律由 `vehicleShading.ts` 按几何位置分件生成（车身 / 玻璃 / 轮胎 / 轮辋 / 结构件 /
外壳 / 机腹 / 深蓝尾）。模型转换与上色没有改变未知许可资产的权属。
