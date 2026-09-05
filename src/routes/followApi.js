import { marketplaceRequest } from "@/lib/marketplaceApi";
 
export function getFollowStatus(creatorId) {
  return marketplaceRequest(`/api/follows/creators/${creatorId}/status`);
}
 
export function followCreator(creatorId) {
  return marketplaceRequest(`/api/follows/creators/${creatorId}`, {
    method: "POST",
  });
}
 
export function unfollowCreator(creatorId) {
  return marketplaceRequest(`/api/follows/creators/${creatorId}`, {
    method: "DELETE",
  });
}
 
export function getFollowingFeed(page = 1) {
  return marketplaceRequest(`/api/follows/feed?page=${page}&limit=6`);
}
