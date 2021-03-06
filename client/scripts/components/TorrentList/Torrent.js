import classNames from 'classnames';
import {FormattedDate, FormattedMessage, FormattedNumber} from 'react-intl';
import React from 'react';

import CalendarIcon from '../Icons/CalendarIcon';
import ClockIcon from '../Icons/ClockIcon';
import DiskIcon from '../Icons/DiskIcon';
import DownloadThickIcon from '../Icons/DownloadThickIcon';
import Duration from '../General/Duration';
import EventTypes from '../../constants/EventTypes';
import InformationIcon from '../Icons/InformationIcon';
import PeersIcon from '../Icons/PeersIcon';
import ProgressBar from '../General/ProgressBar';
import Ratio from '../General/Ratio';
import RatioIcon from '../Icons/RatioIcon';
import SeedsIcon from '../Icons/SeedsIcon';
import Size from '../General/Size';
import {torrentStatusIcons} from '../../util/torrentStatusIcons';
import {torrentStatusClasses} from '../../util/torrentStatusClasses';
import TorrentDetail from './TorrentDetail';
import UploadThickIcon from '../Icons/UploadThickIcon';

const condensedValueTransformers = {
  downloadTotal: torrent => torrent.bytesDone,
  peers: torrent => torrent.totalPeers,
  percentComplete: torrent => {
    return (
      <ProgressBar percent={torrent.percentComplete}
        icon={torrentStatusIcons(torrent.status)} />
    );
  },
  seeds: torrent => torrent.totalSeeds
};

const condensedSecondaryValueTransformers = {
  peers: torrent => torrent.connectedPeers,
  seeds: torrent => torrent.connectedSeeds
};

const expandedTorrentSectionContent = {
  primary: ['name'],
  secondary: ['eta', 'downloadRate', 'uploadRate'],
  tertiary: ['*']
};

const expandedTorrentDetailsToHide = ['downloadTotal'];

const expandedValueTransformers = {
  peers: torrent => torrent.totalPeers,
  seeds: torrent => torrent.totalSeeds
};

const expandedSecondaryValueTransformers = {
  peers: torrent => torrent.connectedPeers,
  percentComplete: torrent => torrent.bytesDone,
  seeds: torrent => torrent.connectedSeeds
};

const ICONS = {
  clock: <ClockIcon />,
  disk: <DiskIcon />,
  downloadThick: <DownloadThickIcon />,
  information: <InformationIcon />,
  calendar: <CalendarIcon />,
  peers: <PeersIcon />,
  ratio: <RatioIcon />,
  seeds: <SeedsIcon />,
  uploadThick: <UploadThickIcon />
};

const METHODS_TO_BIND = [
  'handleClick',
  'handleDoubleClick',
  'handleRightClick'
];

const TORRENT_PRIMITIVES_TO_OBSERVE = [
  'bytesDone',
  'downloadRate',
  'totalPeers',
  'totalSeeds',
  'uploadRate'
];

const TORRENT_ARRAYS_TO_OBSERVE = [
  'status',
  'tags'
];

class Torrent extends React.Component {
  constructor(props) {
    super();

    this.state = {
      isSelected: props.selected
    };

    METHODS_TO_BIND.forEach(method => {
      this[method] = this[method].bind(this);
    });
  }

  componentWillUpdate(nextProps) {
    if (nextProps.selected !== this.props.selected) {
      this.setState({isSelected: nextProps.selected});
    }
  }

  shouldComponentUpdate(nextProps, nextState) {
    if (nextProps.selected !== this.props.selected
      || nextState.isSelected !== this.state.isSelected
      || nextProps.isCondensed !== this.props.isCondensed) {
      return true;
    }

    let nextTorrent = nextProps.torrent;
    let {torrent} = this.props;

    let shouldUpdate = TORRENT_ARRAYS_TO_OBSERVE.some(key => {
      let nextArr = nextTorrent[key];
      let currentArr = this.props.torrent[key];

      return nextArr.length !== currentArr.length ||
        nextArr.some((nextValue, index) => {
          return nextValue !== currentArr[index];
        });
    });

    if (!shouldUpdate) {
      shouldUpdate = TORRENT_PRIMITIVES_TO_OBSERVE.some(key => {
        return nextTorrent[key] !== torrent[key];
      });
    }

    if (!shouldUpdate) {
      shouldUpdate = Object.keys(nextProps.propWidths).some(key => {
        return nextProps.propWidths[key] !== this.props.propWidths[key];
      });
    }

    if (!shouldUpdate) {
      shouldUpdate = nextProps.columns.some(({id}, index) => {
        return id !== this.props.columns[index].id;
      });
    }

    return shouldUpdate;
  }

  getTags(tags) {
    return tags.map((tag, index) => {
      return (
        <li className="torrent__tag" key={index}>{tag}</li>
      );
    });
  }

  getWidth(slug) {
    const {defaultWidth, defaultPropWidths, propWidths} = this.props;

    return propWidths[slug] || defaultPropWidths[slug] || defaultWidth;
  }

  handleClick(event) {
    this.setState({isSelected: true});
    this.props.handleClick(this.props.torrent.hash, event);
  }

  handleDoubleClick(event) {
    this.props.handleDoubleClick(this.props.torrent, event);
  }

  handleRightClick(event) {
    if (!this.state.isSelected) {
      this.handleClick(event);
    }

    this.props.handleRightClick(this.props.torrent, event);
  }

  render() {
    const {isSelected} = this.state;
    const {isCondensed, columns, torrent} = this.props;
    const columnCount = columns.length;
    const torrentClasses = torrentStatusClasses(
      torrent,
      {
        'torrent--is-selected': isSelected,
        'torrent--is-condensed': isCondensed,
        'torrent--is-expanded': !isCondensed
      },
      'torrent'
    );

    if (isCondensed) {
      const torrentPropertyColumns = columns.reduce((accumulator, {id, visible}) => {
        if (!visible) {
          return accumulator;
        }

        let value = torrent[id];
        let secondaryValue;

        if (id in condensedValueTransformers) {
          value = condensedValueTransformers[id](torrent);
        }

        if (id in condensedSecondaryValueTransformers) {
          secondaryValue = condensedSecondaryValueTransformers[id](torrent);
        }

        accumulator.push(
          <TorrentDetail className="table__cell"
            key={id}
            preventTransform={id === 'percentComplete'}
            secondaryValue={secondaryValue}
            slug={id}
            value={value}
            width={this.getWidth(id)} />
        );

        return accumulator;
      }, []);

      return (
        <li className={torrentClasses} onClick={this.handleClick}
          onContextMenu={this.handleRightClick}
          onDoubleClick={this.handleDoubleClick}>
          {torrentPropertyColumns}
        </li>
      );
    }

    const sections = {primary: [], secondary: [], tertiary: []};

    // Using a for loop to maximize performance.
    for (let index = 0; index < columns.length; index++) {
      const {id, visible} = columns[index];

      if (visible && !expandedTorrentDetailsToHide.includes(id)) {
        let value = torrent[id];
        let secondaryValue;

        if (id in expandedValueTransformers) {
          value = expandedValueTransformers[id](torrent);
        }

        if (id in expandedSecondaryValueTransformers) {
          secondaryValue = expandedSecondaryValueTransformers[id](
            torrent
          );
        }

        if (expandedTorrentSectionContent.primary.includes(id)) {
          sections.primary.push(
            <TorrentDetail
              key={id}
              className="torrent__details__section torrent__details__section--primary"
              slug={id}
              value={value} />
          );
        } else if (expandedTorrentSectionContent.secondary.includes(id)) {
          sections.secondary[
            expandedTorrentSectionContent.secondary.indexOf(id)
          ] = (
            <TorrentDetail icon
              key={id}
              secondaryValue={secondaryValue}
              slug={id}
              value={value} />
          );
        } else {
          sections.tertiary.push(
            <TorrentDetail icon
              key={id}
              secondaryValue={secondaryValue}
              slug={id}
              value={value} />
          );
        }
      }
    }

    return (
      <li className={torrentClasses} onClick={this.handleClick}
        onContextMenu={this.handleRightClick}
        onDoubleClick={this.handleDoubleClick}>
        <div className="torrent__details__section__wrapper">
          {sections.primary}
          <div className="torrent__details__section torrent__details__section--secondary">
            {sections.secondary}
          </div>
        </div>
        <div className="torrent__details__section torrent__details__section--tertiary">
          {sections.tertiary}
        </div>
        <div className="torrent__details__section torrent__details__section--quaternary">
          <ProgressBar percent={torrent.percentComplete}
            icon={torrentStatusIcons(torrent.status)} />
        </div>
        <button className="torrent__more-info floating-action__button"
          onClick={this.props.handleDetailsClick.bind(this, torrent)}
          tabIndex="-1">
          {ICONS.information}
        </button>
      </li>
    );
  }
}

Torrent.defaultProps = {
  isCondensed: false
};

export default Torrent;
