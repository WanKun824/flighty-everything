type Coordinate = [number, number];

type FollowCamera = {
  jumpTo(options: { center: Coordinate }): unknown;
};

type VehicleAnchor = {
  pin(): void;
  unpin(coordinate: Coordinate): void;
  move(coordinate: Coordinate): void;
};

/** Called once per animation frame, without a second timer or camera easing. */
export function createVehicleFollower(camera: FollowCamera, anchor: VehicleAnchor) {
  let following = false;
  let previous: Coordinate | null = null;

  return (coordinate: Coordinate, enabled: boolean) => {
    const changed = !previous || previous[0] !== coordinate[0] || previous[1] !== coordinate[1];
    if (enabled) {
      const entering = !following;
      if (entering) anchor.pin();
      following = true;
      if (entering || changed) {
        // Omitting zoom, pitch and bearing preserves the user's current view.
        camera.jumpTo({ center: coordinate });
        previous = coordinate;
        return true;
      }
    } else {
      if (following) anchor.unpin(coordinate);
      else if (changed) anchor.move(coordinate);
      following = false;
    }
    previous = coordinate;
    return false;
  };
}

/** Selecting a segment has exactly the same camera invariants as following it. */
export function selectedSegmentCamera(center: Coordinate) {
  return { center };
}
