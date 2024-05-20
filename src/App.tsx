import { DefaultPluginUISpec, PluginUISpec } from 'molstar/lib/mol-plugin-ui/spec';
import { Plugin } from 'molstar/lib/mol-plugin-ui/plugin';
import { SbNcbrPartialCharges } from 'molstar/lib/extensions/sb-ncbr';
import { PluginSpec } from 'molstar/lib/mol-plugin/spec';
import { PluginUIContext } from 'molstar/lib/mol-plugin-ui/context';
import { Download, ParseCif } from 'molstar/lib/mol-plugin-state/transforms/data';
import { TrajectoryFromMmCif, ModelFromTrajectory, StructureFromModel, StructureComponent } from 'molstar/lib/mol-plugin-state/transforms/model';
import { StructureRepresentation3D } from 'molstar/lib/mol-plugin-state/transforms/representation';
import { SbNcbrTunnels } from './extension/behavior';
import { ChannelsDBdata, Tunnel, TunnelDB } from './extension/data-model';
import { TunnelFromRawData, TunnelShapeProvider } from './extension/representation';
import { StateTransforms } from 'molstar/lib/mol-plugin-state/transforms';
import { ColorGenerator } from 'molstar/lib/extensions/meshes/mesh-utils';

const MySpec: PluginUISpec = {
    ...DefaultPluginUISpec(),
    layout: {
        initial: {
            isExpanded: true,
            showControls: true,
            regionState: {
                bottom: 'full',
                left: 'full',
                right: 'full',
                top: 'full',
            },
        },
    },
    behaviors: [
        PluginSpec.Behavior(SbNcbrPartialCharges),
        PluginSpec.Behavior(SbNcbrTunnels),
        ...DefaultPluginUISpec().behaviors,
    ],
};

async function load(plugin: PluginUIContext, url: string) {
    const update = plugin.build();
    const structure = update.toRoot()
        .apply(Download, { url, isBinary: true })
        .apply(ParseCif)
        .apply(TrajectoryFromMmCif)
        .apply(ModelFromTrajectory)
        .apply(StructureFromModel);
    const polymer = structure.apply(StructureComponent, { type: { name: 'static', params: 'polymer' } });
    polymer.apply(StructureRepresentation3D, {
        type: { name: 'cartoon', params: { alpha: 1 } },
        colorTheme: { name: 'chain-id', params: {} },
    });
    await update.commit();
}

async function visualizeTunnels(plugin: PluginUIContext, url: string) {
    const update = plugin.build();
    const webgl = plugin.canvas3dContext?.webgl;

    const response = await(await fetch(url.toString())).json();
    const tunnels: Tunnel[] = [];

    Object.entries(response.Channels as ChannelsDBdata).forEach(([key, values]) => {
        if (values.length > 0) {
            values.forEach((item: TunnelDB) => {
                tunnels.push({ data: item.Profile, props: { id: item.Id, type: item.Type } });
            });
        }
    });

    tunnels.forEach(async (tunnel) => {
        update
            .toRoot()
            .apply(TunnelFromRawData, { data: tunnel })
            .apply(TunnelShapeProvider, {
                webgl,
                colorTheme: ColorGenerator.next().value,
            })
            .apply(StateTransforms.Representation.ShapeRepresentation3D);
        await update.commit();
    });
}

export function App() {
    const plugin = new PluginUIContext(MySpec);
    plugin.init();

    load(plugin, 'https://models.rcsb.org/3tbg.bcif');
    // runVisualizeTunnels(plugin, 'https://channelsdb2.biodata.ceitec.cz/api/channels/pdb/3tbg');
    visualizeTunnels(plugin, 'https://channelsdb2.biodata.ceitec.cz/api/channels/pdb/3tbg');

    return <Plugin plugin={plugin} />;
}
