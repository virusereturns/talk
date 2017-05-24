import React, {Component} from 'react';
import * as notification from 'coral-admin/src/services/notification';
import key from 'keymaster';
import styles from './styles.css';
import translations from 'coral-admin/src/translations';
import I18n from 'coral-framework/modules/i18n/i18n';

import BanUserDialog from './BanUserDialog';
import SuspendUserDialog from './SuspendUserDialog';
import ModerationQueue from './ModerationQueue';
import ModerationMenu from './ModerationMenu';
import ModerationHeader from './ModerationHeader';
import NotFoundAsset from './NotFoundAsset';
import ModerationKeysModal from '../../../components/ModerationKeysModal';
import UserDetail from '../containers/UserDetail';

const lang = new I18n(translations);

export default class Moderation extends Component {
  state = {
    selectedIndex: 0,
  }

  componentWillMount() {
    const {toggleModal, singleView} = this.props;

    key('s', () => singleView());
    key('shift+/', () => toggleModal(true));
    key('esc', () => toggleModal(false));
    key('j', this.select(true));
    key('k', this.select(false));
    key('r', this.moderate(false));
    key('t', this.moderate(true));
  }

  onClose = () => {
    this.toggleModal(false);
  }

  moderate = (accept) => () => {
    const {acceptComment, rejectComment} = this.props;
    const {selectedIndex} = this.state;
    const comments = this.getComments();
    const comment = comments[selectedIndex];
    const commentId = {commentId: comment.id};

    if (accept) {
      comment.status !== 'ACCEPTED' && acceptComment(commentId);
    } else {
      comment.status !== 'REJECTED' && rejectComment(commentId);
    }
  }

  getComments = () => {
    const {data, route} = this.props;
    const activeTab = route.path === ':id' ? 'premod' : route.path;
    return data[activeTab];
  }

  select = (next) => () => {
    if (next) {
      this.setState((prevState) =>
        ({
          ...prevState,
          selectedIndex: prevState.selectedIndex < this.getComments().length - 1
            ? prevState.selectedIndex + 1 : prevState.selectedIndex
        }));
    } else {
      this.setState((prevState) =>
        ({
          ...prevState,
          selectedIndex: prevState.selectedIndex > 0 ?
            prevState.selectedIndex - 1 : prevState.selectedIndex
        }));
    }
  }

  suspendUser = async (args) => {
    this.props.hideSuspendUserDialog();
    try {
      const result = await this.props.suspendUser(args);
      if (result.data.suspendUser.errors) {
        throw result.data.suspendUser.errors;
      }
      notification.success(
        lang.t('suspenduser.notify_suspend_until',
          this.props.moderation.suspendUserDialog.username,
          lang.timeago(args.until)),
      );
      const {commentStatus, commentId} = this.props.moderation.suspendUserDialog;
      if (commentStatus !== 'REJECTED') {
        return this.props.rejectComment({commentId})
          .then((result) => {
            if (result.data.setCommentStatus.errors) {
              throw result.data.setCommentStatus.errors;
            }
          });
      }
    }
    catch(err) {
      notification.showMutationErrors(err);
    }
  };

  componentWillUnmount() {
    key.unbind('s');
    key.unbind('shift+/');
    key.unbind('esc');
    key.unbind('j');
    key.unbind('k');
    key.unbind('r');
    key.unbind('t');
  }

  componentDidUpdate(_, prevState) {

    // If paging through using keybaord shortcuts, scroll the page to keep the selected
    // comment in view.
    if (prevState.selectedIndex !== this.state.selectedIndex) {

      // the 'smooth' flag only works in FF as of March 2017
      document.querySelector(`.${styles.selected}`).scrollIntoView({behavior: 'smooth'});
    }
  }

  render () {
    const {data, moderation, settings, assets, viewUserDetail, hideUserDetail, ...props} = this.props;
    const providedAssetId = this.props.params.id;
    const activeTab = this.props.route.path === ':id' ? 'premod' : this.props.route.path;

    let asset;

    if (providedAssetId) {
      asset = assets.find((asset) => asset.id === this.props.params.id);

      if (!asset) {
        return <NotFoundAsset assetId={providedAssetId} />;
      }
    }

    const comments = data[activeTab];
    let activeTabCount;
    switch(activeTab) {
    case 'all':
      activeTabCount = data.allCount;
      break;
    case 'accepted':
      activeTabCount = data.acceptedCount;
      break;
    case 'premod':
      activeTabCount = data.premodCount;
      break;
    case 'flagged':
      activeTabCount = data.flaggedCount;
      break;
    case 'rejected':
      activeTabCount = data.rejectedCount;
      break;
    }

    return (
      <div>
        <ModerationHeader asset={asset} />
        <ModerationMenu
          asset={asset}
          allCount={data.allCount}
          acceptedCount={data.acceptedCount}
          premodCount={data.premodCount}
          rejectedCount={data.rejectedCount}
          flaggedCount={data.flaggedCount}
          selectSort={this.props.setSortOrder}
          sort={this.props.moderation.sortOrder}
        />
        <ModerationQueue
          currentAsset={asset}
          comments={comments}
          activeTab={activeTab}
          singleView={moderation.singleView}
          selectedIndex={this.state.selectedIndex}
          bannedWords={settings.wordlist.banned}
          suspectWords={settings.wordlist.suspect}
          showBanUserDialog={props.showBanUserDialog}
          showSuspendUserDialog={props.showSuspendUserDialog}
          acceptComment={props.acceptComment}
          rejectComment={props.rejectComment}
          loadMore={props.loadMore}
          assetId={providedAssetId}
          sort={this.props.moderation.sortOrder}
          commentCount={activeTabCount}
          currentUserId={this.props.auth.user.id}
          viewUserDetail={viewUserDetail}
          hideUserDetail={hideUserDetail}
        />
        <BanUserDialog
          open={moderation.banDialog}
          user={moderation.user}
          commentId={moderation.commentId}
          commentStatus={moderation.commentStatus}
          handleClose={props.hideBanUserDialog}
          handleBanUser={props.banUser}
          showRejectedNote={moderation.showRejectedNote}
          rejectComment={props.rejectComment}
        />
        <SuspendUserDialog
          open={moderation.suspendUserDialog.show}
          username={moderation.suspendUserDialog.username}
          userId={moderation.suspendUserDialog.userId}
          organizationName={data.settings.organizationName}
          onCancel={props.hideSuspendUserDialog}
          onPerform={this.suspendUser}
        />
        <ModerationKeysModal
          hideShortcutsNote={props.hideShortcutsNote}
          shortcutsNoteVisible={moderation.shortcutsNoteVisible}
          open={moderation.modalOpen}
          onClose={this.onClose}/>
        {moderation.userDetailId && (
          <UserDetail
            id={moderation.userDetailId}
            hideUserDetail={hideUserDetail} />
        )}
      </div>
    );
  }
}

