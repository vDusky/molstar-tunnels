import { StateTransforms } from 'molstar/lib/mol-plugin-state/transforms';
import { PluginContext } from 'molstar/lib/mol-plugin/context';
import { ChannelsDBdata, Tunnel, TunnelDB } from './data-model';
import { TunnelsFromRawData, SelectTunnel, TunnelShapeProvider, TunnelFromRawData } from './representation';


export const DB_URL = 'https://channelsdb2.biodata.ceitec.cz/api/channels/';
export const SUB_DB = 'pdb';
export const CHANNEL = '1ymg';

export const URL = `${DB_URL}${SUB_DB}/${CHANNEL}`;

export async function runVisualizeTunnels(plugin: PluginContext, url: string = URL) {
    const update = plugin.build();
    const webgl = plugin.canvas3dContext?.webgl;

    const response = await (await fetch(url)).json();

    const tunnels: Tunnel[] = [];
    Object.entries(response.Channels as ChannelsDBdata).forEach(([key, values]) => {
        if (values.length > 0) {
            values.forEach((item: TunnelDB) => {
                tunnels.push({ data: item.Profile, props: { id: item.Id, type: item.Type } });
            });
        }
    });

    update
        .toRoot()
        .apply(TunnelsFromRawData, { data: tunnels })
        .apply(SelectTunnel)
        .apply(TunnelShapeProvider, {
            webgl,
        })
        .apply(StateTransforms.Representation.ShapeRepresentation3D);

    await update.commit();
}

export async function runVisualizeTunnel(plugin: PluginContext) {
    const update = plugin.build();
    const webgl = plugin.canvas3dContext?.webgl;

    const response = await (await fetch(URL)).json();

    const tunnel = response.Channels.TransmembranePores_MOLE[0];

    update
        .toRoot()
        .apply(TunnelFromRawData, { data: { data: tunnel.Profile, props: { id: tunnel.Id, type: tunnel.Type } } })
        .apply(TunnelShapeProvider, {
            webgl,
        })
        .apply(StateTransforms.Representation.ShapeRepresentation3D);

    await update.commit();
}
