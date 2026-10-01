/**
 * The one place that maps an ``OsResourceType`` to its list endpoint. The
 * picker and the shared display cache both load through it, so both ask
 * for the same thing: only active images, availability zones of the
 * compute service unless another one is named, subnets of one network or
 * all of them.
 */
import { openstackResourcesApi, type OsResourceType } from './openstack-resources.api'

export interface ListOptions {
  /** Only the subnets of this network. */
  networkId?: string | null
  /** Service whose availability zones are listed; ``compute`` by default. */
  azService?: 'compute' | 'network' | 'volume'
}

export async function listOsResources(type: OsResourceType, options: ListOptions = {}): Promise<any[]> {
  const res = await request(type, options)
  return res.data || []
}

function request(type: OsResourceType, { networkId, azService }: ListOptions) {
  switch (type) {
    case 'network':
      return openstackResourcesApi.listNetworks()
    case 'subnet':
      return openstackResourcesApi.listSubnets(networkId || undefined)
    case 'flavor':
      return openstackResourcesApi.listFlavors()
    case 'image':
      return openstackResourcesApi.listImages('active')
    case 'keypair':
      return openstackResourcesApi.listKeypairs()
    case 'security_group':
      return openstackResourcesApi.listSecurityGroups()
    case 'floating_ip_pool':
      return openstackResourcesApi.listFloatingIpPools()
    case 'volume':
      return openstackResourcesApi.listVolumes()
    case 'router':
      return openstackResourcesApi.listRouters()
    case 'availability_zone':
      return openstackResourcesApi.listAvailabilityZones(azService || 'compute')
  }
}
