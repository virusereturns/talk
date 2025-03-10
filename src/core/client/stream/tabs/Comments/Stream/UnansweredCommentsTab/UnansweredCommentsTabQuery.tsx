import { Localized } from "@fluent/react/compat";
import React, { FunctionComponent } from "react";
import { graphql } from "react-relay";

import {
  QueryRenderData,
  QueryRenderer,
  withLocalStateContainer,
} from "coral-framework/lib/relay";
import { Flex, Spinner } from "coral-ui/components/v2";
import { QueryError } from "coral-ui/components/v3";

import { UnansweredCommentsTabQuery as QueryTypes } from "coral-stream/__generated__/UnansweredCommentsTabQuery.graphql";
import { UnansweredCommentsTabQueryLocal as Local } from "coral-stream/__generated__/UnansweredCommentsTabQueryLocal.graphql";

import { useStaticFlattenReplies } from "../../helpers";
import SpinnerWhileRendering from "../AllCommentsTab/SpinnerWhileRendering";
import UnansweredCommentsTabContainer from "./UnansweredCommentsTabContainer";

interface Props {
  local: Local;
  preload?: boolean;
}

export const render = (
  data: QueryRenderData<QueryTypes>,
  flattenReplies: boolean
) => {
  if (data.error) {
    return <QueryError error={data.error} />;
  }
  if (data.props) {
    if (!data.props.story) {
      return (
        <Localized id="comments-streamQuery-storyNotFound">
          <div>Story not found</div>
        </Localized>
      );
    }

    return (
      <SpinnerWhileRendering>
        <UnansweredCommentsTabContainer
          settings={data.props.settings}
          viewer={data.props.viewer}
          story={data.props.story}
          flattenReplies={flattenReplies}
        />
      </SpinnerWhileRendering>
    );
  }
  return (
    <Flex justifyContent="center">
      <Spinner />
    </Flex>
  );
};

const UnansweredCommentsTabQuery: FunctionComponent<Props> = (props) => {
  const {
    local: { storyID, storyURL, commentsOrderBy },
  } = props;
  const flattenReplies = useStaticFlattenReplies();
  return (
    <QueryRenderer<QueryTypes>
      query={graphql`
        query UnansweredCommentsTabQuery(
          $storyID: ID
          $storyURL: String
          $commentsOrderBy: COMMENT_SORT
          $flattenReplies: Boolean!
        ) {
          viewer {
            ...UnansweredCommentsTabContainer_viewer
          }
          story: stream(id: $storyID, url: $storyURL) {
            ...UnansweredCommentsTabContainer_story
              @arguments(orderBy: $commentsOrderBy, tag: UNANSWERED)
          }
          settings {
            ...UnansweredCommentsTabContainer_settings
          }
        }
      `}
      variables={{
        storyID,
        storyURL,
        commentsOrderBy,
        flattenReplies,
      }}
      render={(data) => (props.preload ? null : render(data, flattenReplies))}
    />
  );
};

const enhanced = withLocalStateContainer(
  graphql`
    fragment UnansweredCommentsTabQueryLocal on Local {
      storyID
      storyURL
      commentsOrderBy
    }
  `
)(UnansweredCommentsTabQuery);

export default enhanced;
